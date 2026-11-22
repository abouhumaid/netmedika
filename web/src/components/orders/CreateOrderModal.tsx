import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Upload, X } from 'lucide-react';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Inhaler',
  'Injection',
  'Topical Cream',
  'Ointment',
  'Eye Drops',
  'Solution',
];

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [medicineName, setMedicineName] = useState('');
  const [dosageForm, setDosageForm] = useState('Tablet');
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        error('Invalid File', 'Please select an image file (PNG, JPG, JPEG).');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!medicineName.trim() && !imageFile) {
      error('Input Required', 'Please provide either a medication name or upload a prescription image.');
      return;
    }

    if (medicineName.trim() && (!deliveryAddress || deliveryAddress.trim().length < 10)) {
      error('Address Required', 'Please provide a valid delivery address (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createOrder({
        medicine_name: medicineName.trim() || undefined,
        dosage_form: dosageForm,
        quantity,
        delivery_address: deliveryAddress.trim() || undefined,
        uploaded_image: imageFile,
      });

      success('Order Placed Successfully', `Order #${res.order_id} has been initiated.`);
      onSuccess();
      onClose();
      // Reset form
      setMedicineName('');
      setQuantity(1);
      setDeliveryAddress('');
      handleRemoveImage();
    } catch (err: any) {
      error('Order Creation Failed', err.message || 'Could not create order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Order / Prescription"
      subtitle="Input patient medication details or upload a physical prescription"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Medication Name & Strength
          </label>
          <div className="relative">
            <input
              type="text"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              placeholder="e.g. Amoxicillin 500mg, Metformin 850mg"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pharmacy-500 text-sm text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dosage Form
            </label>
            <select
              value={dosageForm}
              onChange={(e) => setDosageForm(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pharmacy-500 text-sm text-slate-800 bg-white"
            >
              {DOSAGE_FORMS.map((form) => (
                <option key={form} value={form}>
                  {form}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              max="99"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pharmacy-500 text-sm text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Delivery Address <span className="text-slate-400 font-normal">(min. 10 chars)</span>
          </label>
          <textarea
            rows={2}
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Complete street address, city, and nearest landmark for courier dispatch..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pharmacy-500 text-sm text-slate-800"
          />
        </div>

        {/* Prescription File Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Prescription Document / Photo (Optional)
          </label>
          {imagePreview ? (
            <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={imagePreview}
                  alt="Prescription Preview"
                  className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                />
                <div className="text-xs">
                  <p className="font-semibold text-slate-800 truncate max-w-[200px]">
                    {imageFile?.name}
                  </p>
                  <p className="text-slate-500">
                    {imageFile && (imageFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-pharmacy-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-pharmacy-50/30"
            >
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-slate-700">
                Click to attach prescription image
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or WEBP up to 10MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit Order
          </Button>
        </div>
      </form>
    </Modal>
  );
};
