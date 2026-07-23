import React, { useState } from 'react';
import { Search, Trash2, Pencil } from 'lucide-react';

interface TransmittalHistoryProps {
  history: any[];
  loadTransmittal: (t: any) => void;
  deleteTransmittal: (id: string) => void;
}

export const TransmittalHistory: React.FC<TransmittalHistoryProps> = ({
  history,
  loadTransmittal,
  deleteTransmittal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery.trim()
    ? history.filter(
        (t) =>
          t.transmittalNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.department || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : history;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Saved Transmittals
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search transmittals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">
          {history.length === 0
            ? 'No saved transmittals yet.'
            : 'No transmittals match your search.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">
                  No.
                </th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">
                  Date
                </th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">
                  Subject
                </th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">
                  Dept
                </th>
                <th className="text-center py-2 px-3 font-medium text-gray-600">
                  Items
                </th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2 px-3 font-medium text-blue-700">
                    {t.transmittalNo}
                  </td>
                  <td className="py-2 px-3 text-gray-600">
                    {new Date(t.date).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-3 text-gray-700 max-w-[200px] truncate">
                    {t.subject || '—'}
                  </td>
                  <td className="py-2 px-3 text-gray-600">
                    {t.department || '—'}
                  </td>
                  <td className="py-2 px-3 text-center text-gray-600">
                    {Array.isArray(t.items) ? t.items.length : 0}
                  </td>
                  <td className="py-2 px-3 text-right space-x-1">
                    <button
                      onClick={() => loadTransmittal(t)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Load for editing"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            'Delete this transmittal? This cannot be undone.'
                          )
                        ) {
                          deleteTransmittal(t.id);
                        }
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
