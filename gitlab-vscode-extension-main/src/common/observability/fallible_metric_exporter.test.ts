import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import { InstrumentType } from '@opentelemetry/sdk-metrics';
import type { PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { log } from '../log';
import { FallibleMetricExporter } from './fallible_metric_exporter';

jest.mock('../log');

const makeResult = (code: ExportResultCode): ExportResult => ({ code });
const SUCCESS = makeResult(ExportResultCode.SUCCESS);
const FAILED = makeResult(ExportResultCode.FAILED);

const emptyMetrics = {} as ResourceMetrics;

function makeInnerExporter(result: ExportResult): jest.Mocked<PushMetricExporter> {
  return {
    export: jest.fn((_metrics, cb) => cb(result)),
    forceFlush: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    selectAggregationTemporality: jest.fn(),
    selectAggregation: jest.fn(),
  };
}

describe('FallibleMetricExporter', () => {
  describe('when exports succeed', () => {
    it('delegates to the inner exporter and returns SUCCESS', () => {
      const inner = makeInnerExporter(SUCCESS);
      const exporter = new FallibleMetricExporter(inner);
      const cb = jest.fn();

      exporter.export(emptyMetrics, cb);

      expect(inner.export).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(SUCCESS);
    });

    it('resets consecutive failure count on success', () => {
      const inner = makeInnerExporter(FAILED);
      const exporter = new FallibleMetricExporter(inner, 5);
      const cb = jest.fn();

      exporter.export(emptyMetrics, cb);
      exporter.export(emptyMetrics, cb);

      inner.export.mockImplementation((_m, c) => c(SUCCESS));
      exporter.export(emptyMetrics, cb);

      inner.export.mockImplementation((_m, c) => c(FAILED));
      exporter.export(emptyMetrics, cb);
      exporter.export(emptyMetrics, cb);

      expect(inner.export).toHaveBeenCalledTimes(5);
      expect(log.warn).not.toHaveBeenCalled();
    });
  });

  describe('when exports fail consecutively', () => {
    it('opens the circuit after reaching the threshold', () => {
      const inner = makeInnerExporter(FAILED);
      const exporter = new FallibleMetricExporter(inner, 3);
      const cb = jest.fn();

      exporter.export(emptyMetrics, cb);
      exporter.export(emptyMetrics, cb);
      exporter.export(emptyMetrics, cb);

      expect(log.warn).toHaveBeenCalledTimes(1);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('3 consecutive times'));
    });

    it('stops delegating to the inner exporter once the circuit is open', () => {
      const inner = makeInnerExporter(FAILED);
      const exporter = new FallibleMetricExporter(inner, 3);
      const cb = jest.fn();

      exporter.export(emptyMetrics, cb);
      exporter.export(emptyMetrics, cb);
      exporter.export(emptyMetrics, cb);

      exporter.export(emptyMetrics, cb);
      exporter.export(emptyMetrics, cb);

      expect(inner.export).toHaveBeenCalledTimes(3);
    });

    it('returns SUCCESS silently when the circuit is open', () => {
      const inner = makeInnerExporter(FAILED);
      const exporter = new FallibleMetricExporter(inner, 3);
      const cb = jest.fn();

      exporter.export(emptyMetrics, cb);
      exporter.export(emptyMetrics, cb);
      exporter.export(emptyMetrics, cb);

      cb.mockClear();
      exporter.export(emptyMetrics, cb);

      expect(cb).toHaveBeenCalledWith(SUCCESS);
    });

    it('logs only once even after many failures', () => {
      const inner = makeInnerExporter(FAILED);
      const exporter = new FallibleMetricExporter(inner, 2);
      const cb = jest.fn();

      for (let i = 0; i < 10; i++) exporter.export(emptyMetrics, cb);

      expect(log.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('delegation', () => {
    it('delegates forceFlush to the inner exporter', async () => {
      const inner = makeInnerExporter(SUCCESS);
      await new FallibleMetricExporter(inner).forceFlush();
      expect(inner.forceFlush).toHaveBeenCalledTimes(1);
    });

    it('delegates shutdown to the inner exporter', async () => {
      const inner = makeInnerExporter(SUCCESS);
      await new FallibleMetricExporter(inner).shutdown();
      expect(inner.shutdown).toHaveBeenCalledTimes(1);
    });

    it('delegates selectAggregationTemporality to the inner exporter', () => {
      const inner = makeInnerExporter(SUCCESS);
      const exporter = new FallibleMetricExporter(inner);
      exporter.selectAggregationTemporality?.(InstrumentType.COUNTER);
      expect(inner.selectAggregationTemporality).toHaveBeenCalledTimes(1);
    });

    it('delegates selectAggregation to the inner exporter', () => {
      const inner = makeInnerExporter(SUCCESS);
      const exporter = new FallibleMetricExporter(inner);
      exporter.selectAggregation?.(InstrumentType.COUNTER);
      expect(inner.selectAggregation).toHaveBeenCalledTimes(1);
    });
  });
});
