import { type ReactNode, useEffect, useId, useState } from "react";
import { InfoIcon } from "zudoku/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "zudoku/ui/Tooltip.js";

// Public rates in ten-thousandths of a dollar. The example uses three model
// periods and one carrier minute (30 seconds rounded up to a full minute).
const prices = [
  { name: "One-shot-call", modelRate: 296, carrierRate: 400 },
  { name: "Goal", modelRate: 148, carrierRate: 200 },
].map((price) => {
  const model = price.modelRate * 3;
  const carrier = price.carrierRate;
  return { ...price, model, carrier, total: model + carrier };
});
const money = (amount: number) => `$${(amount / 10000).toFixed(4)}`;
const feeTypes = [
  { key: "model", label: "Model Fee", rateKey: "modelRate", unit: "10 seconds", usage: "3 × 10-second periods" },
  { key: "carrier", label: "Carrier Fee", rateKey: "carrierRate", unit: "minute", usage: "1 minute (rounded up)" },
] as const;

export function BillingComparison({ children }: { children: ReactNode }) {
  const captionId = useId();
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const dismiss = () => { setActive(null); setPinned(false); };

  return (
    <figure className="billing-comparison" aria-labelledby={captionId}>
      <figcaption id={captionId}>
        <span className="billing-comparison__caption">30-second call</span>
        <span className="billing-comparison__context">Domestic outbound · US / CA · USD</span>
      </figcaption>
      <div className="billing-comparison__plot">
        {prices.map((price) => (
          <div key={price.name} className={`billing-comparison__row billing-comparison__row--${price.name === "Goal" ? "goal" : "oneshot"}`}>
            <div className="billing-comparison__row-heading">
              <span className="billing-comparison__name">
                {price.name}
                {price.name === "Goal" && <span className="billing-comparison__saving">Half price</span>}
              </span>
              <span className="billing-comparison__total">{money(price.total)}</span>
            </div>
            <div className="billing-comparison__track">
              <div
              className={`billing-comparison__bar billing-comparison__bar--${price.name === "Goal" ? "goal" : "oneshot"}`}
              style={{ width: `${(price.total / prices[0].total) * 100}%` }}
            >
              {feeTypes.map((fee) => {
                const id = `${price.name}-${fee.key}`;
                return (
                  <Tooltip
                    key={id}
                    open={active === id}
                    delayDuration={100}
                    onOpenChange={(next) => {
                      if (!pinned) setActive((current) => next ? id : current === id ? null : current);
                    }}
                  >
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={!ready}
                        className={`billing-comparison__segment billing-comparison__${fee.key}`}
                        style={{ flex: price[fee.key] }}
                        aria-label={`${price.name} ${fee.label}: ${money(price[fee.rateKey])} per ${fee.unit}. Show price details`}
                        aria-expanded={active === id}
                        onClick={(event) => {
                          // Keep taps pinned instead of Radix's default click-to-close.
                          event.preventDefault();
                          if (pinned && active === id) dismiss();
                          else { setActive(id); setPinned(true); }
                        }}
                        onBlur={() => {
                          setActive((current) => current === id ? null : current);
                          setPinned(false);
                        }}
                      />
                    </TooltipTrigger>
                    {active === id && <TooltipContent
                      className="billing-cost-tooltip"
                      side="top"
                      align="center"
                      sideOffset={10}
                      collisionPadding={16}
                      onEscapeKeyDown={dismiss}
                      onPointerDownOutside={(event) => {
                        const target = event.detail.originalEvent.target;
                        if (target instanceof Element && target.closest(".billing-comparison__segment")) return;
                        dismiss();
                      }}
                    >
                      <div className="billing-cost-tooltip__context">{price.name} · {fee.label} · Preview</div>
                      <div className="billing-cost-tooltip__rate">
                        {money(price[fee.rateKey])}<span> / {fee.unit}</span>
                      </div>
                      <dl className="billing-cost-tooltip__fees">
                        <div>
                          <dt>30-second usage</dt><dd>{fee.usage}</dd>
                        </div>
                        <div className="billing-cost-tooltip__total">
                          <dt>{fee.label}</dt><dd>{money(price[fee.key])}</dd>
                        </div>
                      </dl>
                    </TooltipContent>}
                  </Tooltip>
                );
              })}
              </div>
              {price.name === "Goal" && (
                <div className="billing-comparison__saved">
                  <span>You save</span>
                  <strong>{money(prices[0].total - price.total)}</strong>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="billing-comparison__legend" aria-hidden="true">
        <span><i className="billing-comparison__model" />Model Fee · / 10s</span>
        <span><i className="billing-comparison__carrier" />Carrier Fee · / min</span>
      </div>
      <p className="billing-comparison__hint"><InfoIcon aria-hidden="true" /> Hover or tap a segment for its rate · Preview</p>
      {/* Preserve the equivalent breakdown in Markdown and LLM exports. */}
      <div hidden>{children}</div>
    </figure>
  );
}
