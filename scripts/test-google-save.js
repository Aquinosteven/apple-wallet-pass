import assert from "node:assert/strict";
import { buildGenericClassAndObject } from "../api/google-save.js";

const issuerId = "3388000000022901234";
const body = {
  classSuffix: "showfi.generic.v1",
  objectSuffix: "sample_join_test",
  issuerName: "ShowFi",
  cardTitle: "ShowFi Ticket",
  header: "Concert Night",
  subheader: "General Admission",
  details: "Doors open at 7 PM",
  joinUrl: "https://example.com/join/event-123",
};

const result = buildGenericClassAndObject({
  issuerId,
  body,
  classSuffix: body.classSuffix,
  objectSuffix: body.objectSuffix,
});

const genericObject = result.genericObject;
assert.equal(genericObject.appLinkData?.webAppLinkInfo?.appTarget?.targetUri?.uri, body.joinUrl);
assert.equal(genericObject.appLinkData?.webAppLinkInfo?.appTarget?.targetUri?.description, "Join");

const joinLink = genericObject.linksModuleData?.uris?.find((item) => item.id === "join");
assert.ok(joinLink, "Expected linksModuleData.uris to include a join link");
assert.equal(joinLink.uri, body.joinUrl);
assert.equal(joinLink.description, "Join");

console.log("PASS: google-save builder includes Join link in appLinkData and linksModuleData");
