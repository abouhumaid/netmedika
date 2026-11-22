import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { resolveMediaUrl } from '../../utils/formatters';
import { ZoomIn, ZoomOut, RotateCw, Download, ImageOff } from 'lucide-react';
import { Button } from '../common/Button';

interface PrescriptionViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  orderId?: string;
  medicationName?: string | null;
  patientName?: string | null;
}

export const PrescriptionViewerModal: React.FC<PrescriptionViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  orderId,
  medicationName,
  patientName,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const fullUrl = resolveMediaUrl(imageUrl);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title={`Prescription Document — ${orderId || 'Order'}`}
      subtitle={`${medicationName || 'Prescription Order'} • Patient: ${patientName || 'Customer'}`}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-medium px-1 text-slate-600 min-w-[45px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <button
              onClick={handleRotate}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center gap-2">
            {fullUrl && (
              <a
                href={fullUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </a>
            )}
            <Button size="sm" variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      }
    >
      <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[420px] max-h-[580px] flex items-center justify-center p-4">
        {fullUrl ? (
          <div
            className="transition-transform duration-200 ease-out max-w-full max-h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={fullUrl}
              alt="Uploaded Prescription"
              className="max-h-[500px] w-auto object-contain rounded shadow-2xl pointer-events-none select-none"
              onError={(e) => {
                // If relative link failed, fallback to direct port 8000
                const target = e.currentTarget;
                if (!target.src.includes(':8000') && imageUrl) {
                  target.src = `http://localhost:8000/${imageUrl.replace(/^\//, '')}`;
                }
              }}
            />
          </div>
        ) : (
          <div className="text-center text-slate-400 py-12">
            <ImageOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No prescription image uploaded for this order</p>
            <p className="text-xs text-slate-500 mt-1">This order was placed by medication name</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
