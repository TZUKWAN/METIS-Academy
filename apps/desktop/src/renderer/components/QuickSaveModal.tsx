import { useState } from "react";

export function QuickSaveModal({ onClose, onSave }: { onClose: () => void; onSave: (slot: number) => void }): React.JSX.Element {
  const [slot, setSlot] = useState(1);
  const slots = Array.from({ length: 9 }, (_, i) => i + 1);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="card w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-serif text-lg font-bold">快捷保存</h3>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {slots.map((s) => (
            <button
              key={s}
              className={`rounded-md border px-3 py-2 text-sm ${slot === s ? "border-accent bg-ink-700" : "border-ink-600 hover:border-paper-400"}`}
              onClick={() => setSlot(s)}
            >
              槽位 {s}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={() => onSave(slot)}>保存</button>
        </div>
      </div>
    </div>
  );
}
