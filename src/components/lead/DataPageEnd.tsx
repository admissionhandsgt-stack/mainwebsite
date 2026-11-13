import type { ComponentProps, ReactNode } from "react";
import CiteThis from "@/components/seo/CiteThis";
import TelegramJoin from "@/components/engage/TelegramJoin";
import TelegramRoundAlert from "@/components/engage/TelegramRoundAlert";
import ExpertPlaybook from "@/components/lead/ExpertPlaybook";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import LeadCapture from "@/components/lead/LeadCapture";

/**
 * The end of every data page, in one order (2026-11-13, owner: "SEO ke chakkar mai bhot sare patches, chije tukdo mai
 * add ki thi … complete website & mobile site ko organise kardo"). Before this, each page stacked its own tail and
 * most said the same thing two or three times: a Telegram round alert and a Telegram invite with the same heading, and
 * three "talk to a counsellor" blocks (the playbook, the counsellor card, the counsellor band). Now:
 *
 *   1. Cite this — about the data just read, so right after it
 *   2. Telegram — one box: the round alert while a NEET PG result is next, the channel invite otherwise
 *   3. The counsellor — the playbook (what a counsellor checks, with live counts) and one card beside it: the PG
 *      counsellor card with the quick call-back form, or for a page without one the counsellor band
 *   4. The page's own FAQ (children)
 *
 * The layout then adds the searched questions, related searches and the not-yet-indexed neighbours, then the footer.
 * Nothing is hidden: only repeated blocks were merged, and every link the page had stays (the predictor, WhatsApp and
 * call are in the counsellor card).
 */
export default function DataPageEnd({
  cite,
  telegram,
  playbook,
  counsel,
  lead,
  children,
}: {
  cite?: ComponentProps<typeof CiteThis>;
  /** `round: false` for a page that should never carry the round alert (UG and non-PG pages). */
  telegram?: { placement: string; round?: boolean };
  playbook?: ComponentProps<typeof ExpertPlaybook>;
  counsel?: ComponentProps<typeof DataPageCounsel>;
  /** The counsellor band, used only where there is no PG counsellor card. */
  lead?: ComponentProps<typeof LeadCapture>;
  children?: ReactNode;
}) {
  const roundAlert = telegram && telegram.round !== false;
  return (
    <>
      {cite && (
        <section className="container-custom pt-10 md:pt-14">
          <CiteThis {...cite} />
        </section>
      )}
      {telegram && roundAlert && <TelegramRoundAlert placement={`round_alert_${telegram.placement}`} className="pt-10 md:pt-14" />}
      {telegram && <TelegramJoin placement={telegram.placement} unlessRound={roundAlert} className="!pb-0" />}
      {(playbook || counsel) && (
        <section className="container-custom pt-10 md:pt-14" id="counsellor">
          {playbook && <ExpertPlaybook bare {...playbook} />}
          {counsel && <DataPageCounsel {...counsel} />}
        </section>
      )}
      {/* The band carries its own container; it stands in for the card only where a page has none. */}
      {!counsel && lead && (
        <div className={playbook ? "-mt-4" : "pt-10 md:pt-14"}>
          <LeadCapture {...lead} />
        </div>
      )}
      {children}
    </>
  );
}
