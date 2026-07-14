import { randomUUID } from "expo-crypto";

function createIdentifier(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function createSessionId() {
  return createIdentifier("session");
}

export function createPracticeTimeId() {
  return createIdentifier("practice");
}
