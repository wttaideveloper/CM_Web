import { reconcileEventModules, reconcileSelectedEventModules } from "./event-modules";
import type { EventModules, EventTypeDefinition } from "./events.service";
import { strict as assert } from "node:assert";
import { test } from "node:test";

const modules = (overrides: Partial<EventModules>): EventModules => ({ registration: true, tickets: false, sessions: false, check_in: false, online_meeting: false, custom_questions: false, meals: false, accommodation: false, ...overrides });
const eventType = (defaults: Partial<EventModules>, allowed: Partial<EventModules>, required: Partial<EventModules>): Pick<EventTypeDefinition, "default_modules" | "allowed_modules" | "required_modules"> => ({ default_modules: modules(defaults), allowed_modules: modules(allowed), required_modules: modules(required) });

const camp = eventType({ meals: true }, { meals: true, accommodation: true }, { accommodation: true });
const privateFunction = eventType({ tickets: true, online_meeting: true }, { tickets: true, online_meeting: true }, {});
const marathon = eventType({ check_in: true }, { check_in: true, sessions: true }, { check_in: true });

test("Camp -> Private Function and back uses the newly selected policy", () => {
  assert.deepEqual(reconcileEventModules(privateFunction, reconcileEventModules(camp, null, false), false), privateFunction.default_modules);
  assert.deepEqual(reconcileEventModules(camp, reconcileEventModules(privateFunction, null, false), false), { ...camp.default_modules, accommodation: true });
});
test("Camp -> Marathon -> Camp leaves a valid Camp policy", () => {
  const final = reconcileEventModules(camp, reconcileEventModules(marathon, reconcileEventModules(camp, null, false), false), false);
  assert.deepEqual(final, { ...camp.default_modules, accommodation: true });
});
test("required modules are true and disallowed modules are false", () => {
  assert.deepEqual(reconcileEventModules(camp, modules({ accommodation: false, sessions: true }), true), { ...camp.default_modules, accommodation: true, sessions: true });
  assert.equal(reconcileEventModules(eventType({ tickets: true }, { tickets: false }, {}), modules({ tickets: true }), true).tickets, false);
});
test("clearing Event Type does not retain a previous capability map", () => {
  assert.equal(reconcileSelectedEventModules(undefined, camp.default_modules), null);
});
