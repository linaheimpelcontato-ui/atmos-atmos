interface WidgetOptions {
  container: HTMLElement;
  key: string;
  signerName: string;
  isCurrent: () => boolean;
  onSigned: () => void;
}

/** Dispose both delayed script loading and callbacks retained by the widget. */
export function mountClicksignWidget(options: WidgetOptions): () => void {
  let active = true;
  const current = () => active && options.isCurrent();
  options.container.replaceChildren();
  const script = document.createElement("script");
  script.src = "https://app.clicksign.com/js/widget.js";
  script.async = true;
  script.onload = () => {
    if (!current()) return;
    const widget = (window as unknown as { Clicksign?: { configure: (config: {
      container: string; key: string; signer: { display_name: string }; onSigned: () => void;
    }) => void } }).Clicksign;
    widget?.configure({
      container: options.container.id,
      key: options.key,
      signer: { display_name: options.signerName },
      onSigned: () => { if (current()) options.onSigned(); },
    });
  };
  document.head.appendChild(script);
  return () => {
    active = false;
    script.onload = null;
    script.remove();
    options.container.replaceChildren();
  };
}
