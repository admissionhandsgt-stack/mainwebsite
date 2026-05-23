import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, AlertCircle, Link as LinkIcon, Image as ImageIcon, Hash } from 'lucide-react';
import { motion } from 'framer-motion';

interface AlertFormData {
  id?: number;
  title: string;
  link: string;
  image_url: string;
  is_active: boolean;
  order_index: number;
}

interface AlertFormProps {
  alert: AlertFormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (field: string, value: string | number | boolean) => void;
  isEditing?: boolean;
}

const AlertForm = ({ alert, onSubmit, onChange, isEditing = false }: AlertFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2 group">
          <Label htmlFor="title" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
            Alert Title
          </Label>
          <div className="relative">
            <AlertCircle className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-medical-500 transition-colors" />
            <Input
              id="title"
              value={alert.title}
              onChange={(e) => onChange('title', e.target.value)}
              required
              placeholder="e.g. NEET UG 2024 Results Announced"
              className="pl-10 bg-white/50 border-gray-200 focus:border-medical-500 focus:ring-medical-500/20 rounded-xl transition-all duration-300"
            />
          </div>
        </div>

        <div className="space-y-2 group">
          <Label htmlFor="link" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
            Target Link
          </Label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-medical-500 transition-colors" />
            <Input
              id="link"
              value={alert.link}
              onChange={(e) => onChange('link', e.target.value)}
              required
              placeholder="https://..."
              className="pl-10 bg-white/50 border-gray-200 focus:border-medical-500 focus:ring-medical-500/20 rounded-xl transition-all duration-300"
            />
          </div>
        </div>

        <div className="space-y-2 group">
          <Label htmlFor="image_url" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
            Thumbnail URL (Optional)
          </Label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-medical-500 transition-colors" />
            <Input
              id="image_url"
              value={alert.image_url}
              onChange={(e) => onChange('image_url', e.target.value)}
              placeholder="https://..."
              className="pl-10 bg-white/50 border-gray-200 focus:border-medical-500 focus:ring-medical-500/20 rounded-xl transition-all duration-300"
            />
          </div>
        </div>

        <div className="space-y-2 group">
          <Label htmlFor="order" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
            Display Order
          </Label>
          <div className="relative">
            <Hash className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-medical-500 transition-colors" />
            <Input
              id="order"
              type="number"
              value={alert.order_index}
              onChange={(e) => onChange('order_index', parseInt(e.target.value))}
              required
              className="pl-10 bg-white/50 border-gray-200 focus:border-medical-500 focus:ring-medical-500/20 rounded-xl transition-all duration-300"
            />
          </div>
        </div>

        <div className="flex items-center p-4 bg-white/50 border border-gray-100 rounded-xl mt-6">
          <Switch
            id="is_active"
            checked={alert.is_active}
            onCheckedChange={(checked) => onChange('is_active', checked)}
            className="data-[state=checked]:bg-emerald-500"
          />
          <div className="ml-3">
            <Label htmlFor="is_active" className="text-gray-900 font-medium cursor-pointer">Live Status</Label>
            <p className="text-xs text-gray-500">Toggle to publish or hide this alert instantly.</p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block w-full sm:w-auto">
          <Button 
            type="submit"
            className="w-full sm:w-auto bg-gradient-to-r from-medical-600 to-medical-500 hover:from-medical-700 hover:to-medical-600 text-white shadow-md shadow-medical-500/20 rounded-xl px-8 transition-all duration-300"
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Save Changes' : 'Publish Alert'}
          </Button>
        </motion.div>
      </div>
    </form>
  );
};

export default AlertForm;
