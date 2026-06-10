# Stage 1: Build
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# Download dependencies (cached layer)
RUN chmod +x mvnw && ./mvnw dependency:resolve -B

# Copy source code
COPY src ./src

# Build the application
RUN ./mvnw package -DskipTests -B

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

# Install curl for health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r parking && useradd -r -g parking -d /app parking

# Create required directories
RUN mkdir -p /app/uploads/face-enrollments /app/logs \
    && chown -R parking:parking /app

# Copy the built jar
COPY --from=builder /app/target/*.jar app.jar

# Copy logback configuration
# (logback-spring.xml is packaged inside the jar via src/main/resources)

# Set ownership
RUN chown -R parking:parking /app

USER parking

# Environment variables
ENV JAVA_OPTS="-Xms256m -Xmx512m"
ENV DB_URL=jdbc:postgresql://postgres:5432/parking_db
ENV DB_USERNAME=postgres
ENV DB_PASSWORD=postgres
ENV JWT_SECRET=changeMeInProductionToASecureRandomKeyThatIsAtLeast256Bits
ENV SPRING_PROFILES_ACTIVE=default

EXPOSE 8080

# Health check - actuator health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]