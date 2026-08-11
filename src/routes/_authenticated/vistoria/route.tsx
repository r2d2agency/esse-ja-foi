import { createFileRoute } from '@tanstack/react-router';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Clock } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/vistoria')({
  component: VistoriaDashboard,
});

function VistoriaDashboard() {
  return (
    <MobileLayout title="Minhas Vistorias">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Hoje, 24 FEV</h2>
          <span className="text-xs bg-teal-100 text-teal-900 px-2 py-1 rounded font-bold">2 PENDENTES</span>
        </div>

        {[
          { id: '1', placa: 'ABC-1234', modelo: 'Toyota Corolla 2022', local: 'Pátio Central', hora: '10:30' },
          { id: '2', placa: 'XYZ-9876', modelo: 'Honda Civic 2021', local: 'Unidade Norte', hora: '14:00' },
        ].map((item) => (
          <Card key={item.id} className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-teal-900 tabular-nums">{item.placa}</h3>
                  <p className="text-sm font-medium text-gray-600">{item.modelo}</p>
                </div>
                <div className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                  <Clock className="h-3 w-3 text-gray-500" />
                  <span className="text-xs font-bold text-gray-700">{item.hora}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-gray-500">
                <MapPin className="h-4 w-4" />
                <span className="text-xs">{item.local}</span>
              </div>

              <button className="w-full bg-teal-900 text-white py-3 rounded-lg font-bold text-sm uppercase tracking-widest mt-2 active:bg-teal-950 transition-colors">
                Iniciar Vistoria
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </MobileLayout>
  );
}
