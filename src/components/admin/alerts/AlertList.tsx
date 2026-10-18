import RecordActions from '@/components/admin/shared/RecordActions';
import { Badge, Toggle } from '@/components/admin/ui';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';

interface Alert {
  id: number;
  title: string;
  link: string;
  image_url?: string;
  is_active: boolean;
  order_index: number;
  /** Migration 0026: set when the feed added it from an official board. */
  auto?: boolean;
  source?: string | null;
  expires_at?: string | null;
}

const day = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : null;

interface AlertListProps {
  alerts: Alert[];
  onToggleActive: (id: number, currentStatus: boolean) => void;
  onEdit: (alert: Alert) => void;
  onDelete: (id: number) => void;
}

/** One row per alert: what it says, where it goes, who added it, and its switch. */
const AlertList = ({ alerts, onToggleActive, onEdit, onDelete }: AlertListProps) => {
  return (
    <ul className="divide-y divide-slate-100">
      {alerts.map((alert) => {
        const expired = !!alert.expires_at && new Date(alert.expires_at) < new Date();
        return (
          <li key={alert.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:gap-6">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">{alert.title}</p>

              <a
                href={alert.link}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] text-cyan-700 hover:text-cyan-800 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{alert.link}</span>
              </a>

              {alert.image_url && (
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{alert.image_url}</span>
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                <span>{alert.auto ? "Added automatically from an official notice board" : "Added by the team"}</span>
                {alert.expires_at &&
                  (expired ? (
                    <Badge tone="warning">Expired {day(alert.expires_at)}</Badge>
                  ) : (
                    <span>Leaves the site {day(alert.expires_at)}</span>
                  ))}
                <span className="tabular-nums">Order {alert.order_index}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 lg:shrink-0">
              <Toggle
                checked={alert.is_active}
                onChange={() => onToggleActive(alert.id, alert.is_active)}
                label={
                  <span className={alert.is_active ? "font-medium text-emerald-700" : "text-slate-500"}>
                    {alert.is_active ? "Live" : "Hidden"}
                  </span>
                }
              />
              <RecordActions onEdit={() => onEdit(alert)} onDelete={() => onDelete(alert.id)} />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default AlertList;
