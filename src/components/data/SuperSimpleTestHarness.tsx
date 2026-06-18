"use client";

import { useState, useEffect } from 'react';
import { DuckDBManager } from '@/components/data/manager';
import styles from "@/app/styles/styles.module.css"

const TEST_SHARD_URL = "https://pub-da55962965ef442481b26138d7c59630.r2.dev/shard_0.parquet";
const SHARD_ID = "shard_0";

export function SuperSimpleTestHarness() {
  const [engineStatus, setEngineStatus] = useState("Booting database...");
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [totalCacheCount, setTotalCacheCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Added state to display rows pulled back from our new range functions
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const db = DuckDBManager.getInstance();

  // Boot up the database context instantly on page-load
  useEffect(() => {
    db.connect((msg) => setEngineStatus(msg))
      .then(() => {
        setEngineStatus("🟢 DuckDB + OPFS Fully Armed");
        refreshGlobalCount();
      })
      .catch((err) => setEngineStatus(`🔴 Boot Fail: ${err.message}`));
  }, []);

  const refreshGlobalCount = async () => {
    try {
      const res = await db.query("SELECT COUNT(*)::INTEGER as total FROM cached_timeline_history;");
      setTotalCacheCount(res[0]?.total ?? 0);
    } catch {
      setTotalCacheCount(0);
    }
  };

  const handleSyncSegment = async (segment: 'first' | 'second') => {
    setLoading(true);
    
    // 🎯 Determine [offset, limit] parameters based on selection choice
    // first half = rows 1-1000 (Offset 0, Pull 1000)
    // second half = rows 1001-2000 (Offset 1000, Pull 1000)
    const range: [number, number] = segment === 'first' ? [0, 1000] : [1000, 1000];
    const rangeLabel = segment === 'first' ? "Rows 1-1000" : "Rows 1001-2000";
    
    addLog(`Initiating incremental R2 stream request for ${rangeLabel}...`);

    try {
      // 1. Execute the incremental fetch routine from the Parquet cloud file
      const newRowsCaptured = await db.getShard(SHARD_ID, TEST_SHARD_URL, range);
      addLog(`Success! Net newly appended records into OPFS cache: +${newRowsCaptured} rows.`);
      
      // 2. Instantly update the counter
      await refreshGlobalCount();

      // 3. Let's pull a preview page of 5 items using our new getRecordsFromShard method 
      // to prove data is moving down cleanly into our OPFS structured schema
      const fetchedItems = await db.getRecordsFromShard(SHARD_ID, [segment === 'first' ? 0 : 1000, 5]);
      setPreviewRows(fetchedItems);
      addLog(`Pulled ${fetchedItems.length} local cache rows for screen display preview.`);

    } catch (err: any) {
      addLog(`❌ Error streaming segment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (msg: string) => {
    setSyncLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  return (
    <div>
      {/* Engine Status Block */}
      <div>
        <p>System Engine Status:</p>
        <p>{engineStatus}</p>
        <div className="mt-3 pt-2 border-t border-gray-800 flex justify-between">
          <span>Total Records Active inside Local Cache:</span>
          <span>{totalCacheCount} rows</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div>
        <button
          onClick={() => handleSyncSegment('first')}
          disabled={loading}
        >
          Button 0 <br /> 
          <span>Sync Rows: 1 - 1,000</span>
        </button>

        <button
          onClick={() => handleSyncSegment('second')}
          disabled={loading} >
          Button 1 <br /> 
          <span>Sync Rows: 1,001 - 2,000</span>
        </button>
      </div>

      {/* Dynamic Data Preview Grid Block */}
      {previewRows.length > 0 && (
        <div>
          <br/>
      
          <p>⚡ OPFS Data View (First 5 Rows of Segment):</p>
              <hr></hr>
          <div>
            {previewRows.map((row) => (
              <div key={row.id} className={styles.data_row}>
                <p >{row.label} ({row.id})</p>
                <p>{row.description}</p>
                {row.core?.occupation && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    💼 Occupations: {row.core.occupation.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logger Box */}
      <div>
        <p >Live Ingestion Diagnostic Output Logs:</p>
        <p >=============================================================================</p>
        <div >
          {syncLogs.length === 0 && <p >Standby. Click a segment target above to fire pipeline...</p>}
          {syncLogs.map((log, index) => (
            <p key={index} >YO{log}</p>
          ))}
        </div>
      </div>
    </div>
  );
}