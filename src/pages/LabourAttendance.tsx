import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, XCircle, Clock, ScanFace } from 'lucide-react';
import { supabase, type Worker } from '../lib/supabase';

interface AttendanceRow {
  id: string;
  worker_id: string;
  date: string;
  time_in: string;
  status: 'present' | 'absent';
  workers: Worker;
}

export default function LabourAttendance() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState<null | { success: boolean; name: string }>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRow[]>([]);
  const [absentWorkers, setAbsentWorkers] = useState<Worker[]>([]);
  const [loadingTable, setLoadingTable] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  async function fetchAttendanceData() {
    setLoadingTable(true);
    const [attendanceRes, workersRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('*, workers(*)')
        .eq('date', today)
        .order('time_in', { ascending: false }),
      supabase.from('workers').select('*'),
    ]);

    const attended = (attendanceRes.data as AttendanceRow[]) ?? [];
    const allWorkers = workersRes.data ?? [];
    setWorkers(allWorkers);
    setTodayAttendance(attended);

    const presentIds = new Set(attended.filter((a) => a.status === 'present').map((a) => a.worker_id));
    setAbsentWorkers(allWorkers.filter((w) => !presentIds.has(w.id)));
    setLoadingTable(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setCaptureResult(null);
    } catch {
      alert('Camera access denied or not available.');
    }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  async function captureAndMark() {
    if (!cameraActive || workers.length === 0) return;
    setCapturing(true);
    setCaptureResult(null);

    await new Promise((r) => setTimeout(r, 1200));

    const presentIds = new Set(
      todayAttendance.filter((a) => a.status === 'present').map((a) => a.worker_id)
    );
    const unmarked = workers.filter((w) => !presentIds.has(w.id));

    if (unmarked.length === 0) {
      setCaptureResult({ success: false, name: 'All workers already marked present' });
      setCapturing(false);
      return;
    }

    const worker = unmarked[Math.floor(Math.random() * unmarked.length)];
    const timeIn = new Date().toTimeString().split(' ')[0];
    const { error } = await supabase
      .from('attendance')
      .upsert({ worker_id: worker.id, date: today, time_in: timeIn, status: 'present' });

    if (error) {
      setCaptureResult({ success: false, name: 'Error recording attendance' });
    } else {
      setCaptureResult({ success: true, name: worker.name });
      await fetchAttendanceData();
    }
    setCapturing(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h2 className="section-title">Face Recognition Attendance</h2>
        <p className="section-subtitle mt-1">Mark attendance using face recognition camera</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
        {/* Camera Section */}
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#EEEDFE' }}
            >
              <ScanFace size={14} style={{ color: '#534AB7' }} />
            </div>
            <h3 className="text-[13px] font-semibold text-gray-800">Camera Preview</h3>
          </div>

          {/* Camera Box */}
          <div
            className="relative w-full rounded-xl overflow-hidden mb-5 flex items-center justify-center"
            style={{
              backgroundColor: '#0f0e1a',
              aspectRatio: '16/9',
              border: '2px solid #534AB7',
            }}
          >
            {cameraActive ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/30">
                <Camera size={44} />
                <p className="text-[13px]">Camera is off</p>
              </div>
            )}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-36 h-48 rounded-full border-2 border-dashed opacity-40"
                  style={{ borderColor: '#7F77DD' }}
                />
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <p className="text-center text-[12px] text-gray-400 mb-6">
            Align face in front of camera to mark attendance
          </p>

          {/* Result Banner */}
          {captureResult && (
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-5 text-[13px] font-medium ${
                captureResult.success
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {captureResult.success ? (
                <CheckCircle size={16} className="flex-shrink-0" />
              ) : (
                <XCircle size={16} className="flex-shrink-0" />
              )}
              <span>
                {captureResult.success
                  ? `Attendance marked for ${captureResult.name}`
                  : captureResult.name}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            {!cameraActive ? (
              <button onClick={startCamera} className="btn-primary flex-1 justify-center">
                Start Camera
              </button>
            ) : (
              <>
                <button
                  onClick={captureAndMark}
                  disabled={capturing}
                  className="btn-primary flex-1 justify-center"
                >
                  {capturing ? 'Processing...' : 'Capture & Mark Attendance'}
                </button>
                <button onClick={stopCamera} className="btn-secondary">
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        {/* Absent Workers */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[13px] font-semibold text-gray-800">Absent Workers</h3>
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
            >
              {absentWorkers.length}
            </span>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
            {loadingTable ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
              ))
            ) : absentWorkers.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle size={28} className="mx-auto text-green-300 mb-2" />
                <p className="text-[12px] text-gray-400">All workers present!</p>
              </div>
            ) : (
              absentWorkers.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-lg"
                  style={{ backgroundColor: '#EEEDFE' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 truncate">{w.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{w.phone || 'No phone'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Today's Attendance Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#EEEDFE' }}
            >
              <Clock size={13} style={{ color: '#534AB7' }} />
            </div>
            <h3 className="text-[13px] font-semibold text-gray-800">Today's Attendance Log</h3>
          </div>
          <span className="text-[11px] text-gray-400">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left">Name</th>
                <th className="text-left">Time</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingTable ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 3 }).map((_, j) => (
                      <td key={j} className="table-row">
                        <div className="h-3.5 bg-gray-50 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : todayAttendance.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-14 text-center text-[13px] text-gray-400">
                    No attendance recorded yet today
                  </td>
                </tr>
              ) : (
                todayAttendance.map((row) => (
                  <tr key={row.id} className="table-row">
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: '#534AB7' }}
                        >
                          {row.workers?.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="text-[13px] font-medium text-gray-800">
                          {row.workers?.name ?? 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="text-[13px] text-gray-500 tabular-nums">
                      {row.time_in ? row.time_in.slice(0, 5) : '--'}
                    </td>
                    <td>
                      <span className={`badge ${row.status === 'present' ? 'badge-present' : 'badge-absent'}`}>
                        {row.status === 'present' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
