import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import type { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { log } from '../log';
import { FallibleSpanExporter } from './fallible_span_exporter';

jest.mock('../log');

const makeResult = (code: ExportResultCode): ExportResult => ({ code });
const SUCCESS = makeResult(ExportResultCode.SUCCESS);
const FAILED = makeResult(ExportResultCode.FAILED);

const emptySpans: ReadableSpan[] = [];

function makeInnerExporter(result: ExportResult): jest.Mocked<SpanExporter> {
  return {
    export: jest.fn((_spans, cb) => cb(result)),
    forceFlush: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
  };
}

describe('FallibleSpanExporter', () => {
  describe('when exports succeed', () => {
    it('delegates to the inner exporter and returns SUCCESS', () => {
      const inner = makeInnerExporter(SUCCESS);
      const exporter = new FallibleSpanExporter(inner);
      const cb = jest.fn();

      exporter.export(emptySpans, cb);

      expect(inner.export).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(SUCCESS);
    });

    it('resets consecutive failure count on success', () => {
      const inner = makeInnerExporter(FAILED);
      const exporter = new FallibleSpanExporter(inner, 5);
      const cb = jest.fn();

      exporter.export(emptySpans, cb);
      exporter.export(emptySpans, cb);

      inner.export.mockImplementation((_s, c) => c(SUCCESS));
      exporter.export(emptySpans, cb);

      inner.export.mockImplementation((_s, c) => c(FAILED));
      exporter.export(emptySpans, cb);
      exporter.export(emptySpans, cb);

      expect(inner.export).toHaveBeenCalledTimes(5);
      expect(log.warn).not.toHaveBeenCalled();
    });
  });

  describe('when exports fail consecutively', () => {
    it('opens the circuit after reaching the threshold', () => {
      const inner = makeInnerExporter(FAILED);
      const exporter = new FallibleSpanExporter(inner, 3);
      const cb = jest.fn();

      exporter.export(emptySpans, cb);
      exporter.export(emptySpans, cb);
      exporter.export(emptySpans, cb);

      expect(log.warn).toHaveBeenCalledTimes(1);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('3 consecutive times'));
    });

    it('stops delegating to the inner exporter once the circuit is open', () => {
      const inner = makeInnerExporter(FAILED);
      const exporter = new FallibleSpanExporter(inner, 3);
      const cb = jest.fn();

      exporter.export(emptySpans, cb);
      exporter.export(emptySpans, cb);
      exporter.export(emptySpans, cb);

      exporter.export(emptySpans, cb);
      exporter.export(emptySpans, cb);

      expect(inner.export).toHaveBeenCalledTimes(3);
    });

    it('returns SUCCESS silently when the circuit is open', () => {
      const inner = makeInnerExporter(FAILED);
      const exporter = new FallibleSpanExporter(inner, 3);
      const cb = jest.fn();

      exporter.export(emptySpans, cb);
      exporter.export(emptySpans, cb);
      exporter.export(emptySpans, cb);

      cb.mockClear();
      exporter.export(emptySpans, cb);

      expect(cb).toHaveBeenCalledWith(SUCCESS);
    });

    it('logs only once even after many failures', () => {
      const inner = makeInnerExporter(FAILED);
      const exporter = new FallibleSpanExporter(inner, 2);
      const cb = jest.fn();

      for (let i = 0; i < 10; i++) exporter.export(emptySpans, cb);

      expect(log.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('delegation', () => {
    it('delegates forceFlush to the inner exporter', async () => {
      const inner = makeInnerExporter(SUCCESS);
      await new FallibleSpanExporter(inner).forceFlush();
      expect(inner.forceFlush).toHaveBeenCalledTimes(1);
    });

    it('resolves forceFlush when inner exporter has no forceFlush', async () => {
      const inner = makeInnerExporter(SUCCESS);
      delete (inner as Partial<SpanExporter>).forceFlush;
      await expect(new FallibleSpanExporter(inner).forceFlush()).resolves.toBeUndefined();
    });

    it('delegates shutdown to the inner exporter', async () => {
      const inner = makeInnerExporter(SUCCESS);
      await new FallibleSpanExporter(inner).shutdown();
      expect(inner.shutdown).toHaveBeenCalledTimes(1);
    });
  });
});
