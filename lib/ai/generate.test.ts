import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  buildReferencePrompt,
  generateReferenceIllustration,
  IMAGE_MODEL,
} from "./generate";
import type { IllustrationStyle } from "@/lib/session/types";

// Two surfaces under test:
//   1. buildReferencePrompt — pure, no network, asserted directly.
//   2. generateReferenceIllustration — its IO collaborators (the OpenAI SDK and
//      the disk-reading photoToFile) are mocked so NO paid API call and no file
//      read ever happens. We assert it forwards the right model/quality/prompt
//      and decodes b64_json → Buffer correctly.

// ---------------------------------------------------------------------------
// buildReferencePrompt (pure)
// ---------------------------------------------------------------------------

describe("buildReferencePrompt", () => {
  it("includes the watercolor style phrasing", () => {
    const prompt = buildReferencePrompt("a golden retriever", "watercolor");
    expect(prompt).toContain("soft watercolor children's-book illustration");
  });

  it("includes the storybook style phrasing", () => {
    const prompt = buildReferencePrompt("a golden retriever", "storybook");
    expect(prompt).toContain("gentle storybook children's-book illustration");
  });

  it("includes the pencil-sketch style phrasing", () => {
    const prompt = buildReferencePrompt("a golden retriever", "pencil");
    expect(prompt).toContain("soft pencil-sketch children's-book illustration");
  });

  it("covers every IllustrationStyle with a distinct phrase", () => {
    const styles: IllustrationStyle[] = ["watercolor", "storybook", "pencil"];
    const prompts = styles.map((s) => buildReferencePrompt("a cat", s));
    // Each style produces a non-empty prompt, and the three are all distinct.
    expect(new Set(prompts).size).toBe(styles.length);
  });

  it("always carries the exact-appearance consistency clause", () => {
    // This clause is the central pet-consistency requirement (style guide:
    // "same breed markings, eye color, body posture across every page").
    const prompt = buildReferencePrompt("a tabby cat", "watercolor");
    expect(prompt).toContain(
      "Maintain the pet's exact appearance — color, markings, and breed characteristics — from the reference photo.",
    );
  });

  it("interpolates the pet description as its own sentence", () => {
    const prompt = buildReferencePrompt(
      "a sweet rescue mutt with floppy ears",
      "watercolor",
    );
    expect(prompt).toContain(
      "The pet is a sweet rescue mutt with floppy ears.",
    );
  });

  it("trims surrounding whitespace from the description", () => {
    const prompt = buildReferencePrompt("  a black tabby  ", "watercolor");
    expect(prompt).toContain("The pet is a black tabby.");
    // No double space from an untrimmed value leaking in.
    expect(prompt).not.toContain("The pet is  a black tabby");
  });

  it("omits the description clause entirely for a blank description", () => {
    const prompt = buildReferencePrompt("", "watercolor");
    expect(prompt).not.toContain("The pet is");
    // The rest of the prompt is still well-formed (style + consistency clause).
    expect(prompt).toContain("soft watercolor children's-book illustration");
    expect(prompt).toContain("Maintain the pet's exact appearance");
  });

  it("treats a whitespace-only description as blank", () => {
    const prompt = buildReferencePrompt("   ", "watercolor");
    expect(prompt).not.toContain("The pet is");
  });
});

// ---------------------------------------------------------------------------
// generateReferenceIllustration — mocked SDK, no network, no disk
// ---------------------------------------------------------------------------

// Capture the args images.edit() is called with so we can assert forwarding.
const editMock = vi.fn();

// Mock the client module: getOpenAI returns a stub whose images.edit is our spy;
// photoToFile is stubbed so no file is read from disk.
vi.mock("@/lib/ai/client", () => ({
  getOpenAI: () => ({ images: { edit: editMock } }),
  photoToFile: vi.fn(async () => "FAKE_UPLOADABLE"),
}));

describe("generateReferenceIllustration (mocked OpenAI)", () => {
  beforeEach(() => {
    editMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("decodes b64_json from the response into the original bytes", async () => {
    const originalBytes = Buffer.from([0x01, 0x02, 0x03, 0xfe, 0xff]);
    editMock.mockResolvedValue({
      data: [{ b64_json: originalBytes.toString("base64") }],
    });

    const result = await generateReferenceIllustration(
      "uploads/sess/photo.jpg",
      "a golden retriever",
      "watercolor",
    );

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.equals(originalBytes)).toBe(true);
  });

  it("forwards the model, size, n, the built prompt, and the default low quality", async () => {
    editMock.mockResolvedValue({
      data: [{ b64_json: Buffer.from([0x00]).toString("base64") }],
    });

    await generateReferenceIllustration(
      "uploads/sess/photo.jpg",
      "a tabby cat",
      "storybook",
    );

    expect(editMock).toHaveBeenCalledTimes(1);
    const args = editMock.mock.calls[0][0];
    expect(args.model).toBe(IMAGE_MODEL);
    expect(args.size).toBe("1024x1024");
    expect(args.n).toBe(1);
    expect(args.quality).toBe("low");
    expect(args.prompt).toBe(buildReferencePrompt("a tabby cat", "storybook"));
    expect(args.image).toBe("FAKE_UPLOADABLE");
  });

  it("passes through an explicit quality tier (e.g. medium for a real run)", async () => {
    editMock.mockResolvedValue({
      data: [{ b64_json: Buffer.from([0x00]).toString("base64") }],
    });

    await generateReferenceIllustration(
      "uploads/sess/photo.png",
      "a bunny",
      "pencil",
      "medium",
    );

    expect(editMock.mock.calls[0][0].quality).toBe("medium");
  });

  it("throws a readable error when the response carries no image data", async () => {
    editMock.mockResolvedValue({ data: [{}] });

    await expect(
      generateReferenceIllustration(
        "uploads/sess/photo.jpg",
        "a dog",
        "watercolor",
      ),
    ).rejects.toThrow(/no image data/i);
  });
});
