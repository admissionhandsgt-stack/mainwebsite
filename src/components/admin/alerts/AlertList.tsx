import { Button } from '@/components/ui/button';
import RecordActions from '@/components/admin/shared/RecordActions';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, ExternalLink, Activity, Image as ImageIcon } from 'lucide-react';

interface Alert {
  id: number;
  title: string;
  link: string;
  image_url?: string;
  is_active: boolean;
  order_index: number;
}

interface AlertListProps {
  alerts: Alert[];
  onToggleActive: (id: number, currentStatus: boolean) => void;
  onEdit: (alert: Alert) => void;
  onDelete: (id: number) => void;
}

const AlertList = ({ alerts, onToggleActive, onEdit, onDelete }: AlertListProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {alerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="group relative bg-white/60 backdrop-blur-md border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl overflow-hidden transition-all duration-300"
          >
            {/* Top Status Bar */}
            <div className={`h-1.5 w-full transition-colors duration-300 ${alert.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />

            <div className="p-5 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${alert.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-400">ORDER: {alert.order_index}</span>
                </div>
                <Button
                  variant={alert.is_active ? "default" : "secondary"}
                  onClick={() => onToggleActive(alert.id, alert.is_active)}
                  size="sm"
                  className={`h-7 px-3 text-xs rounded-full border-0 transition-all ${
                    alert.is_active 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                  }`}
                >
                  <Activity className="w-3 h-3 mr-1" />
                  {alert.is_active ? 'Active' : 'Inactive'}
                </Button>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                {alert.title}
              </h3>

              <div className="space-y-3 mt-auto pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50/50 p-2 rounded-lg">
                  <ExternalLink className="w-4 h-4 text-medical-500 shrink-0" />
                  <a href={alert.link} target="_blank" rel="noreferrer" className="truncate hover:text-medical-600 transition-colors">
                    {alert.link}
                  </a>
                </div>
                
                {alert.image_url && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50/50 p-2 rounded-lg">
                    <ImageIcon className="w-4 h-4 text-teal-500 shrink-0" />
                    <span className="truncate">{alert.image_url}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100/50 flex justify-end">
                <RecordActions
                  onEdit={() => onEdit(alert)}
                  onDelete={() => onDelete(alert.id)}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AlertList;
