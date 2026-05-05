import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, Clock, ScanFace } from 'lucide-react';
import { attendanceApi, type Worker, type AttendanceRow } from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function LabourAttendance() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);

  const { success: toastSuccess, error: toastError } = useToast();

  // ── Camera state ───────────────────────────────────────────────────────────
  const [cameraStream, setCameraStream]   = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive]   = useState(false);
  const [capturing, setCapturing]         = useState(false);
  const [cameraError, setCameraError]     = useState('');

  // ── Attendance data ────────────────────────────────────────────────────────
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRow[]>([]);
  const [absentWorkers, setAbsentWorkers]     = useState<Worker[]>([]);
  const [loadingTable, setLoadingTable]       = useState(true);

  // ── Assign stream to video element AFTER it renders ────────────────────────
  useEffect(() => {
    if (videoRef.current) {
      if (cameraStream) {
        videoRef.current.srcObject = cameraStream;
        videoRef.current.play().catch((err) => {
          console.warn('Video play failed:', err);
        });
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [cameraStream, cameraActive]);

  useEffect(() => { fetchAttendanceData(); }, []);

  async function fetchAttendanceData() {
    setLoadingTable(true);
    try {
      const [todayRes, absentRes] = await Promise.all([
        attendanceApi.today(),
        attendanceApi.absent(),
      ]);
      setTodayAttendance(todayRes.data ?? []);
      setAbsentWorkers(absentRes.data ?? []);
    } catch (e) {
      console.error('Failed to load attendance:', e);
    } finally {
      setLoadingTable(false);
    }
  }

  async function startCamera() {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof DOMException
        ? err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Camera not available or already in use.'
        : 'Could not access camera.';
      setCameraError(msg);
      toastError('Camera Error', msg);
    }
  }

  function stopCamera() {
    cameraStream?.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
    setCameraActive(false);
    setCameraError('');
  }

  async function captureAndMark() {
    if (!cameraStream || !videoRef.current || !canvasRef.current) return;
    setCapturing(true);
    setCaptureResult(null);

    const video  = videoRef.current;
    const canvas = canvasRef.current;

    // Wait for video to have actual frame dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCaptureResult({ success: false, name: 'Camera not ready yet — please wait a moment and try again.' });
      setCapturing(false);
      return;
    }

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('Canvas capture empty')); }, 'image/jpeg', 0.9);
      });

      const fd = new FormData();
      fd.append('image', blob, 'capture.jpg');

      const res = await attendanceApi.markFace(fd);
      if (res.success) {
        toastSuccess('Attendance Marked', `✅ ${res.data.worker.name} marked present`);
        await fetchAttendanceData();
      } else {
        toastError('Face Not Recognized', (res as { message?: string }).message || 'No matching worker found');
      }
    } catch (e: unknown) {
      toastError('Attendance Error', e instanceof Error ? e.message : 'Error marking attendance');
    } finally {
      setCapturing(false);
    }
  }

  function workerName(row: AttendanceRow) {
    if (row.worker_id && typeof row.worker_id === 'object') return (row.worker_id as Worker).name;
    return 'Unknown';
  }

  return (
    <div>
      <div className="mb-10">
        <h2 className="section-title">Face Recognition Attendance</h2>
        <p className="section-subtitle mt-1">Mark attendance using face recognition camera</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
        {/* ── Camera Section ─────────────────────────────────────────────── */}
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEEDFE' }}>
              <ScanFace size={14} style={{ color: '#534AB7' }} />
            </div>
            <h3 className="text-[13px] font-semibold text-gray-800">Camera Preview</h3>
            {cameraActive && (
              <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                LIVE
              </span>
            )}
          </div>

          {/* Camera box — video element always in DOM to keep ref stable */}
          <div
            className="relative w-full rounded-xl overflow-hidden mb-5"
            style={{ backgroundColor: '#0f0e1a', aspectRatio: '16/9', border: '2px solid #534AB7' }}
          >
            {/* Always rendered — shown/hidden via CSS */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ display: cameraActive ? 'block' : 'none' }}
              autoPlay
              muted
              playsInline
            />

            {/* Overlay guide ring */}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-36 h-48 rounded-full border-2 border-dashed opacity-50" style={{ borderColor: '#7F77DD' }} />
              </div>
            )}

            {/* Idle placeholder */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/30">
                <Camera size={44} />
                <p className="text-[13px]">Camera is off</p>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          <p className="text-center text-[12px] text-gray-400 mb-4">
            Align face within the oval guide, then press <strong>Capture</strong>
          </p>


          <div className="flex gap-3">
            {!cameraActive ? (
              <button onClick={startCamera} className="btn-primary flex-1 justify-center">
                <Camera size={15} /> Start Camera
              </button>
            ) : (
              <>
                <button onClick={captureAndMark} disabled={capturing} className="btn-primary flex-1 justify-center">
                  {capturing ? 'Processing…' : 'Capture & Mark Attendance'}
                </button>
                <button onClick={stopCamera} className="btn-secondary">Stop</button>
              </>
            )}
          </div>
        </div>

        {/* ── Absent Workers ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[13px] font-semibold text-gray-800">Absent Workers</h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              {absentWorkers.length}
            </span>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
            {loadingTable ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)
            ) : absentWorkers.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle size={28} className="mx-auto text-green-300 mb-2" />
                <p className="text-[12px] text-gray-400">All workers present!</p>
              </div>
            ) : (
              absentWorkers.map((w) => (
                <div key={w._id || w.id} className="flex items-center gap-3 px-3.5 py-3 rounded-lg" style={{ backgroundColor: '#EEEDFE' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#dc2626' }}>
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

      {/* ── Today's Attendance Table ───────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEEDFE' }}>
              <Clock size={13} style={{ color: '#534AB7' }} />
            </div>
            <h3 className="text-[13px] font-semibold text-gray-800">Today's Attendance Log</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400">
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <button onClick={fetchAttendanceData} className="text-[11px] font-semibold" style={{ color: '#534AB7' }}>
              Refresh
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left">Name</th>
                <th className="text-left">Time</th>
                <th className="text-left">Status</th>
                <th className="text-left">Marked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingTable ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="table-row"><div className="h-3.5 bg-gray-50 rounded animate-pulse w-20" /></td>
                  ))}</tr>
                ))
              ) : todayAttendance.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-14 text-center text-[13px] text-gray-400">No attendance recorded yet today</td></tr>
              ) : (
                todayAttendance.map((row) => (
                  <tr key={row._id || row.id} className="table-row">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#534AB7' }}>
                          {workerName(row).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-medium text-gray-800">{workerName(row)}</span>
                      </div>
                    </td>
                    <td className="text-[13px] text-gray-500 tabular-nums">{row.time ? row.time.slice(0, 5) : '--'}</td>
                    <td><span className="badge badge-present"><CheckCircle size={11} /> Present</span></td>
                    <td className="text-[12px] text-gray-400 capitalize">{(row.marked_by || '').replace('_', ' ')}</td>
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
