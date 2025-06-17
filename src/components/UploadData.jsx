import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabaseClient';
import { CloudUpload, CheckCircle, AlertCircle, X, RefreshCw, Clock, Trash2, PlayCircle, Calendar, Edit2, Save } from 'lucide-react';

export default function UploadData() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ loading: false, success: '', error: '' });
  const [previewData, setPreviewData] = useState(null);
  const [lastUploadData, setLastUploadData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingPoints, setIsProcessingPoints] = useState(false);
  const [dataDownloadDate, setDataDownloadDate] = useState('');
  const [currentRecordId, setCurrentRecordId] = useState(null);

  useEffect(() => {
    // Fetch last upload data from data_dates table
    const getLastUploadData = async () => {
      const { data, error } = await supabase
        .from('data_dates')
        .select('*')
        .order('upload_date', { ascending: false })
        .limit(1);
      
      if (!error && data.length > 0) {
        setLastUploadData(data[0]);
        setCurrentRecordId(data[0].id);
        // Format the download date for the input field
        if (data[0].data_download_date) {
          const downloadDate = new Date(data[0].data_download_date);
          setDataDownloadDate(downloadDate.toISOString().slice(0, 16));
        }
      }
    };
    
    getLastUploadData();
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
      preview: 10,
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

  // Function to refresh customer points after upload
  const refreshCustomerPoints = async () => {
    try {
      const { data, error } = await supabase.rpc('refresh_customer_points');
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Points calculation failed: ${error.message}`);
    }
  };

  // Function to update parsed dates
  const updateParsedDates = async () => {
    try {
      const { data, error } = await supabase.rpc('update_parsed_dates');
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Date parsing failed: ${error.message}`);
    }
  };

  // Function to save upload record with proper Indian timezone
  const saveUploadRecord = async (fileName, recordsCount, downloadDate = null) => {
    try {
      const downloadDateTimestamp = downloadDate ? new Date(downloadDate).toISOString() : null;
      
      const { data, error } = await supabase.rpc('add_upload_record', {
        p_file_name: fileName,
        p_records_count: recordsCount,
        p_data_download_date: downloadDateTimestamp
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving upload record:', error);
      return null;
    }
  };

  // Function to update download date
  const updateDownloadDate = async () => {
    if (!dataDownloadDate) {
      setStatus(s => ({ ...s, error: 'Please select a download date first.' }));
      return;
    }
    
    try {
      const downloadDateTimestamp = new Date(dataDownloadDate).toISOString();
      
      // If we have a current record ID, update it
      if (currentRecordId) {
        const { data, error } = await supabase.rpc('update_download_date', {
          p_id: currentRecordId,
          p_data_download_date: downloadDateTimestamp
        });
        
        if (error) throw error;
        
        setStatus(s => ({ ...s, success: 'Download date updated successfully!', error: '' }));
        
        // Refresh the upload data
        const { data: updatedData } = await supabase
          .from('data_dates')
          .select('*')
          .eq('id', currentRecordId)
          .single();
        
        if (updatedData) {
          setLastUploadData(updatedData);
        }
      } else {
        // If no current record, just show a message that it will be saved with the next upload
        setStatus(s => ({ 
          ...s, 
          success: 'Download date set! It will be saved when you upload your next file.', 
          error: '' 
        }));
      }
      
    } catch (error) {
      setStatus(s => ({ ...s, error: 'Failed to update download date: ' + error.message }));
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
        return newProgress >= 85 ? 85 : newProgress;
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
        
        // Map the CSV data to the new schema field names
        const records = data.map((row) => ({
          "CUSTOMER CODE": row["CUSTOMER CODE"] || row["Customer Code"],
          "CUSTOMER NAME": row["CUSTOMER NAME"] || row["NAME1 & 2"] || row["Customer Name"],
          "HOUSE NAME": row["HOUSE NAME"] || row["House Name"],
          "STREET": row["STREET"] || row["Street"],
          "PLACE": row["PLACE"] || row["Place"],
          "PIN CODE": row["PIN CODE"] || row["Pin Code"],
          "MOBILE": row["MOBILE"] || row["Mobile"],
          "NET WEIGHT": row["NET WEIGHT"] || row["Net Weight"] ? parseFloat(row["NET WEIGHT"] || row["Net Weight"]) || 0 : 0,
          "LAST SALES DATE": row["LAST SALES DATE"] || row["Last Sales Date"],
        }));

        try {
          // Step 1: Upload to sales_records table
          const { error: uploadError } = await supabase
            .from('sales_records')
            .upsert(records, { onConflict: 'CUSTOMER CODE' });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          setUploadProgress(90);
          setIsProcessingPoints(true);

          // Step 2: Refresh customer points
          const pointsResult = await refreshCustomerPoints();
          
          // Step 3: Update parsed dates
          const datesResult = await updateParsedDates();

          // Step 4: Save upload record with Indian timezone
          const downloadDateForSave = dataDownloadDate ? dataDownloadDate : null;
          const uploadRecordId = await saveUploadRecord(file.name, records.length, downloadDateForSave);
          if (uploadRecordId) {
            setCurrentRecordId(uploadRecordId);
          }

          clearInterval(progressInterval);
          setUploadProgress(100);
          setIsProcessingPoints(false);
          
          setTimeout(() => {
            setStatus({ 
              loading: false, 
              success: `Successfully uploaded ${records.length} records! ${pointsResult || ''} ${datesResult || ''}`, 
              error: '' 
            });
          }, 500);
          
        } catch (err) {
          clearInterval(progressInterval);
          setIsProcessingPoints(false);
          setStatus({ loading: false, success: '', error: err.message });
        }
      },
    });
  };

  const resetForm = () => {
    setFile(null);
    setPreviewData(null);
    setStatus({ loading: false, success: '', error: '' });
    setUploadProgress(0);
    setIsProcessingPoints(false);
  };

  const formatFileSize = (size) => {
    if (size < 1024) return size + ' bytes';
    else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
    else return (size / 1048576).toFixed(1) + ' MB';
  };
  
  const formatIndianDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      // Format in Indian timezone
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sales Records Upload</h2>
          <p className="text-sm text-gray-600 mt-1">Upload customer sales data - Points will be automatically calculated</p>
        </div>
        {lastUploadData && (
          <div className="flex flex-col space-y-2 mt-2 sm:mt-0">
            <div className="flex items-center text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-md">
              <Clock className="w-4 h-4 mr-1" />
              <span>Last upload: {formatIndianDate(lastUploadData.upload_date)}</span>
            </div>
            {lastUploadData.data_download_date && (
              <div className="flex items-center text-sm font-medium bg-green-50 text-green-700 px-3 py-1 rounded-md">
                <Calendar className="w-4 h-4 mr-1" />
                <span>Data downloaded: {formatIndianDate(lastUploadData.data_download_date)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Download Date Section */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-blue-600" />
          Data Download Date Management
        </h3>
        
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                When was this data downloaded from source?
              </label>
              <input
                type="datetime-local"
                value={dataDownloadDate}
                onChange={(e) => setDataDownloadDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Select data download date and time"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={updateDownloadDate}
                disabled={!dataDownloadDate}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[80px] justify-center"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </button>
              
              <button
                onClick={() => {
                  setDataDownloadDate('');
                  setStatus(s => ({ ...s, success: '', error: '' }));
                }}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </button>
            </div>
          </div>
          
          {/* Current dates display */}
          {lastUploadData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-blue-200">
              <div className="bg-white p-3 rounded-md border border-gray-200">
                <div className="text-xs font-medium text-blue-600 mb-1">Last Upload Date</div>
                <div className="text-sm text-gray-800">{formatIndianDate(lastUploadData.upload_date)}</div>
              </div>
              
              {lastUploadData.data_download_date && (
                <div className="bg-white p-3 rounded-md border border-gray-200">
                  <div className="text-xs font-medium text-green-600 mb-1">Data Download Date</div>
                  <div className="text-sm text-gray-800">{formatIndianDate(lastUploadData.data_download_date)}</div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <p className="text-xs text-gray-500 mt-3 bg-white p-2 rounded border-l-4 border-blue-400">
          💡 <strong>Tip:</strong> Set the download date to track when data was originally exported from your source system before uploading here.
        </p>
      </div>

      {/* Field mapping guide */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="text-sm font-medium text-amber-800 mb-2">CSV Field Requirements:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-700">
          <p>• <strong>CUSTOMER CODE</strong> (required)</p>
          <p>• <strong>CUSTOMER NAME</strong> or NAME1 & 2</p>
          <p>• <strong>HOUSE NAME</strong></p>
          <p>• <strong>STREET</strong></p>
          <p>• <strong>PLACE</strong></p>
          <p>• <strong>PIN CODE</strong></p>
          <p>• <strong>MOBILE</strong></p>
          <p>• <strong>NET WEIGHT</strong> (in grams, for points calculation)</p>
          <p>• <strong>LAST SALES DATE</strong> (DD/MM/YYYY format)</p>
        </div>
        <p className="text-xs text-amber-600 mt-2">Points Formula: 1 point per 10 grams of gold weight</p>
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
              Showing {previewData ? previewData.length : 0} preview rows from {file ? file.name : ''}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {(status.loading || isProcessingPoints) && (
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-blue-600">
              {isProcessingPoints ? 'Processing points and dates...' : 'Uploading...'}
            </span>
            <span className="text-sm font-medium text-blue-600">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          {isProcessingPoints && (
            <p className="text-xs text-blue-600 mt-1 flex items-center">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Calculating loyalty points and parsing dates...
            </p>
          )}
        </div>
      )}

      {/* Action button */}
      <div className="mb-6">
        <button
          onClick={handleUpload}
          disabled={status.loading || !file || isProcessingPoints}
          className={`flex items-center justify-center px-6 py-3 rounded-md text-white font-medium transition-colors w-full
            ${status.loading || isProcessingPoints
              ? 'bg-blue-400 cursor-not-allowed' 
              : file 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
        >
          {status.loading || isProcessingPoints ? (
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <PlayCircle className="w-5 h-5 mr-2" />
          )}
          {isProcessingPoints ? 'Processing Data...' : 'Upload & Process Sales Data'}
        </button>
      </div>

      {/* Status messages */}
      {status.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4">
          <p className="text-green-700 flex items-start">
            <CheckCircle className="w-5 h-5 mr-2 text-green-500 mt-0.5 flex-shrink-0" /> 
            <span>{status.success}</span>
          </p>
        </div>
      )}
      
      {status.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
          <p className="text-red-700 flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500 mt-0.5 flex-shrink-0" /> 
            <span>{status.error}</span>
          </p>
        </div>
      )}
    </div>
  );
}