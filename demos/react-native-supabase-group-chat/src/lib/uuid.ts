import * as Crypto from "expo-crypto";

export function uuid() {
  return Crypto.randomUUID();
}
