import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";

const DEFAULT_MAX_ATTEMPTS = 3;

function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

// Capacity checks must be performed at Serializable isolation. PostgreSQL's
// default ReadCommitted isolation can allow two callers to observe the same
// final open seat. Prisma reports serialization/deadlock conflicts as P2034;
// retry the whole transaction a small, bounded number of times.
export async function serializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableTransactionError(error) || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw lastError;
}
