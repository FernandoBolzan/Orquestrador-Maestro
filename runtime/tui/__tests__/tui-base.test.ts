import test from "node:test";
import assert from "node:assert/strict";
import { failure, isFailure, isSuccess, loading, mapR, notAsked, success } from "../state/remote-data.ts";
import { removeEntity, selectAll, upsertEntity } from "../state/entities.ts";

test("T1.1 RemoteData preserva epoch, retries e mapeia apenas Success", () => {
  assert.equal(notAsked().kind, "NotAsked");
  assert.equal(loading("e1").epoch, "e1");
  const ok = success(2, "e1");
  assert.equal(mapR(ok, (value) => value * 2).data, 4);
  const failed = failure("offline", "e1", 3);
  assert.ok(isFailure(failed));
  assert.ok(!isSuccess(mapR(failed, () => 1)));
  assert.equal(failed.retries, 3);
});

test("T1.1 coleção normalizada é imutável e preserva ordem no upsert", () => {
  const empty = Object.freeze({ byId: Object.freeze({}), ids: Object.freeze([]) });
  const one = upsertEntity(empty, { id: "a", value: 1 });
  const replaced = upsertEntity(one, { id: "a", value: 2 });
  const two = upsertEntity(replaced, { id: "b", value: 3 });
  assert.deepEqual(two.ids, ["a", "b"]);
  assert.deepEqual(selectAll(two).map((entry) => entry.value), [2, 3]);
  assert.deepEqual(removeEntity(two, "a").ids, ["b"]);
  assert.deepEqual(empty, { byId: {}, ids: [] });
});

