import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `buildDeliveryEmail` is PURE — tested directly (subject/html/text payload). The
// Resend SDK is MOCKED for `sendDeliveryEmail` so no network call is made (the same
// idiom as mocking `openai`/Supabase elsewhere); we assert the payload reaching
// `.emails.send` and the failure handling, never Resend's real send.

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const { buildDeliveryEmail, sendDeliveryEmail } = await import("./email");

const DOWNLOAD_URL = "https://quietlykept.example/download/tok-abc-123";

beforeEach(() => {
  sendMock.mockReset();
  // A successful Resend response is `{ data, error: null }`.
  sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

// ---------------------------------------------------------------------------
// buildDeliveryEmail (pure)
// ---------------------------------------------------------------------------

describe("buildDeliveryEmail", () => {
  it("builds a Story-1 'book' email with the download link in both bodies", () => {
    const { subject, html, text } = buildDeliveryEmail({
      to: "buyer@example.com",
      petName: "Otis",
      storyType: "story-1",
      downloadUrl: DOWNLOAD_URL,
    });

    expect(subject).toBe("Otis's book is ready");
    // The download link is present in both the HTML and plain-text bodies.
    expect(html).toContain(DOWNLOAD_URL);
    expect(text).toContain(DOWNLOAD_URL);
    // Warm, personal copy — the pet name appears in BOTH bodies, and the noun.
    expect(text).toContain("Otis");
    expect(html).toContain("Otis");
    expect(text).toMatch(/book/);
    expect(html).toMatch(/book/);
  });

  it("uses 'letter' for a Story-2 product", () => {
    const { subject, text } = buildDeliveryEmail({
      to: "buyer@example.com",
      petName: "Murphy",
      storyType: "story-2",
      downloadUrl: DOWNLOAD_URL,
    });
    expect(subject).toBe("Murphy's letter is ready");
    expect(text).toMatch(/letter/);
    expect(text).not.toMatch(/\bbook\b/);
  });

  it("links the refund/remake footer to /policies on the same origin", () => {
    const { html, text } = buildDeliveryEmail({
      to: "buyer@example.com",
      petName: "Otis",
      storyType: "story-1",
      downloadUrl: DOWNLOAD_URL,
    });
    const policiesUrl = "https://quietlykept.example/policies";
    expect(html).toContain(policiesUrl);
    expect(text).toContain(policiesUrl);
  });

  it("never emails a raw storage URL — only the tokenized page link", () => {
    const { html, text } = buildDeliveryEmail({
      to: "buyer@example.com",
      petName: "Otis",
      storyType: "story-1",
      downloadUrl: DOWNLOAD_URL,
    });
    // The body links the /download/ page; it must not carry a Supabase storage host.
    expect(html).not.toMatch(/supabase/i);
    expect(text).not.toMatch(/supabase/i);
    expect(html).toContain("/download/");
  });

  it("escapes HTML-significant characters in the interpolated pet name", () => {
    const { html } = buildDeliveryEmail({
      to: "buyer@example.com",
      petName: 'Otis<script>"&',
      storyType: "story-1",
      downloadUrl: DOWNLOAD_URL,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ---------------------------------------------------------------------------
// sendDeliveryEmail (Resend mocked)
// ---------------------------------------------------------------------------

describe("sendDeliveryEmail", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("sends the built payload from FROM_EMAIL to the customer", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.FROM_EMAIL = "Quietly Kept <hello@quietlykept.example>";

    await sendDeliveryEmail({
      to: "buyer@example.com",
      petName: "Otis",
      storyType: "story-1",
      downloadUrl: DOWNLOAD_URL,
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0] as {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(payload.from).toBe("Quietly Kept <hello@quietlykept.example>");
    expect(payload.to).toBe("buyer@example.com");
    expect(payload.subject).toBe("Otis's book is ready");
    expect(payload.html).toContain(DOWNLOAD_URL);
    expect(payload.text).toContain(DOWNLOAD_URL);
    // The API key lives in the Resend client constructor, never in the send
    // payload — assert it can't leak through the message body or fields.
    expect(JSON.stringify(payload)).not.toContain("re_test");
  });

  it("throws when FROM_EMAIL is missing (before any send)", async () => {
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.FROM_EMAIL;

    await expect(
      sendDeliveryEmail({
        to: "buyer@example.com",
        petName: "Otis",
        storyType: "story-1",
        downloadUrl: DOWNLOAD_URL,
      }),
    ).rejects.toThrow(/FROM_EMAIL is not set/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("throws when Resend returns an error (so the caller can leave the order approved)", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.FROM_EMAIL = "hello@quietlykept.example";
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rate limited" },
    });

    await expect(
      sendDeliveryEmail({
        to: "buyer@example.com",
        petName: "Otis",
        storyType: "story-1",
        downloadUrl: DOWNLOAD_URL,
      }),
    ).rejects.toThrow(/Resend send failed: rate limited/);
  });
});
