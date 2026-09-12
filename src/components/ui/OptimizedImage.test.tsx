import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptimizedImage } from "./OptimizedImage";
import { imageSources } from "@/lib/imageSources";

afterEach(cleanup);

describe("media recovery", () => {
  it("tries each candidate once and ends without another network placeholder", () => {
    const onError = vi.fn();
    const { container } = render(<OptimizedImage src="/broken.jpg" fallbackSrcs={["/broken.jpg", "/second.jpg"]} fallbackSrc="/last.jpg" alt="Cachoeira" onError={onError} />);
    for (const src of ["/broken.jpg", "/second.jpg", "/last.jpg"]) {
      expect(container.querySelector("img")).toHaveAttribute("src", src);
      fireEvent.error(container.querySelector("img")!);
    }
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img", { name: "Cachoeira — imagem indisponível" })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("resets a failed image when the product changes", () => {
    const { container, rerender } = render(<OptimizedImage src="/old.jpg" alt="Produto" />);
    fireEvent.error(container.querySelector("img")!);
    rerender(<OptimizedImage src="/new.jpg" alt="Produto" />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/new.jpg");
    fireEvent.load(container.querySelector("img")!);
    expect(container.querySelector("img")).toHaveClass("opacity-100");
  });

  it("uses the original proxy URL without decoding the object key twice", () => {
    const original = "https://assets.example.com/Foto%20com%2520escape.jpg";
    const proxy = `https://wsrv.nl/?url=${encodeURIComponent(original)}&w=900`;
    expect(imageSources(proxy, [original, proxy])).toEqual([proxy, original]);
  });

  it("does not interpret another host as an image proxy", () => {
    const candidate = "https://example.com/wsrv.nl?url=https://other.example.com/image.jpg";
    expect(imageSources(candidate)).toEqual([candidate]);
  });

  it("handles empty and malformed candidates without recursion", () => {
    expect(imageSources("", ["", "not-a-url", "not-a-url"])).toEqual(["not-a-url"]);
  });
});
