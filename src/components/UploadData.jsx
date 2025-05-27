import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabaseClient';
import { CloudUpload, CheckCircle, AlertCircle, X, RefreshCw, Clock, Trash2 } from 'lucide-react';

export default function UploadData() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ loading: false, success: '', error: '' });
  const [previewData, setPreviewData] = useState(null);
  const [lastUploadDate, setLastUploadDate] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    // Fetch last upload date from customer_points table
    const getLastUploadDate = async () => {
      const { data, error } = await supabase
        .from('customer_points')
        .select('LAST_UPDATED')
        .order('LAST_UPDATED', { ascending: false })
        .limit(1);
      
      if (!error && data.length > 0) {
        setLastUploadDate(new Date(data[0].LAST_UPDATED));
      }
    };
    
    getLastUploadDate();
  }, [status.success]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    
    // Check if file is CSV
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setStatus(s => ({ ...s, error: 'Please select a valid CSV file.' }));
      return;
    }
    
    setFile(selectedFile);
    setStatus({ loading: false, success: '', error: '' });
    
    Papa.parse(selectedFile, {
      header: true,
      preview: 10, // Show more rows in preview
      skipEmptyLines: true,
      complete: ({ data }) => setPreviewData(data),
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return setStatus(s => ({ ...s, error: 'Please choose a CSV file.' }));
    setStatus({ loading: true, success: '', error: '' });
    setUploadProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, 300);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data, errors }) => {
        if (errors.length) {
          clearInterval(progressInterval);
          setStatus({ loading: false, success: '', error: 'CSV parse error: ' + errors[0].message });
          return;
        }
        
        // Convert numeric fields
        const records = data.map((row) => ({
          "SL NO": row["SL NO"],
          "CUSTOMER CODE": row["CUSTOMER CODE"],
          "NAME1 & 2": row["NAME1 & 2"],
          "HOUSE NAME": row["HOUSE NAME"],
          STREET: row["STREET"],
          PLACE: row["PLACE"],
          "PIN CODE": row["PIN CODE"],
          PHONE: row["PHONE"],
          MOBILE: row["MOBILE"],
          "NET WEIGHT": row["NET WEIGHT"] ? parseFloat(row["NET WEIGHT"]) : null,
          "LAST SALES DATE": row["LAST SALES DATE"],
        }));

        try {
          const { error } = await supabase
            .from('sales_records')
            .upsert(records, { onConflict: 'CUSTOMER CODE' });

          clearInterval(progressInterval);
          
          if (error) {
            setStatus({ loading: false, success: '', error: error.message });
          } else {
            setUploadProgress(100);
            setTimeout(() => {
              setStatus({ loading: false, success: `Successfully uploaded ${records.length} records!`, error: '' });
              // We won't clear the file and preview here so users can see what they uploaded
            }, 500);
          }
        } catch (err) {
          clearInterval(progressInterval);
          setStatus({ loading: false, success: '', error: 'Upload failed: ' + err.message });
        }
      },
    });
  };

  const resetForm = () => {
    setFile(null);
    setPreviewData(null);
    setStatus({ loading: false, success: '', error: '' });
    setUploadProgress(0);
  };

  const formatFileSize = (size) => {
    if (size < 1024) return size + ' bytes';
    else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
    else return (size / 1048576).toFixed(1) + ' MB';
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    const utcDate = new Date(date);
    // Add IST offset (UTC+5:30)
    utcDate.setMinutes(utcDate.getMinutes() + 330);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(utcDate);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sales Records Upload</h2>
        {lastUploadDate && (
          <div className="flex items-center text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-md mt-2 sm:mt-0">
            <Clock className="w-4 h-4 mr-1" />
            <span>Last data update: {formatDate(lastUploadDate)}</span>
          </div>
        )}
      </div>

      {!file ? (
        // Upload area when no file is selected
        <div 
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-all duration-200 ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <CloudUpload className="w-10 h-10 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Records will be automatically previewed once selected
              </p>
            </div>
          </label>
        </div>
      ) : (
        // Show preview directly when file is selected
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <span className="font-medium text-gray-700 mr-2">{file.name}</span>
              <span className="text-sm text-gray-500">({formatFileSize(file.size)})</span>
            </div>
            <button 
              onClick={resetForm}
              className="p-1 hover:bg-red-50 rounded-full text-red-600 transition-colors"
              title="Remove file"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          {/* Preview table */}
          <div className="border rounded-lg overflow-hidden mb-4">
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    {previewData && previewData[0] && Object.keys(previewData[0]).map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData && previewData.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {Object.values(row).map((value, i) => (
                        <td
                          key={i}
                          className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs"
                        >
                          {value || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="py-2 px-4 bg-gray-50 text-sm text-gray-500 border-t">
              Showing {previewData ? previewData.length : 0} of {file ? file.name : ''} rows
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {status.loading && (
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-blue-600">Uploading...</span>
            <span className="text-sm font-medium text-blue-600">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Action button */}
      <div className="mb-6">
        <button
          onClick={handleUpload}
          disabled={status.loading || !file}
          className={`flex items-center justify-center px-6 py-3 rounded-md text-white font-medium transition-colors w-full
            ${status.loading 
              ? 'bg-blue-400 cursor-not-allowed' 
              : file 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
        >
          {status.loading ? (
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <CloudUpload className="w-5 h-5 mr-2" />
          )}
          Upload Sales Data
        </button>
      </div>

      {/* Status messages */}
      {status.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4">
          <p className="text-green-700 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-500" /> 
            <span>{status.success}</span>
          </p>
        </div>
      )}
      
      {status.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
          <p className="text-red-700 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" /> 
            <span>{status.error}</span>
          </p>
        </div>
      )}
    </div>
  );
}