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
        .order('id', { ascending: false })
        .limit(1);
      
      if (!error && data.length > 0) {
        
        setLastUploadData(data[0]);
        setCurrentRecordId(data[0].id);
        // Format the download date for the input field (IST from database)
        if (data[0].data_download_date) {
          const istDate = new Date(data[0].data_download_date);
          // Format for datetime-local input
          const year = istDate.getFullYear();
          const month = String(istDate.getMonth() + 1).padStart(2, '0');
          const day = String(istDate.getDate()).padStart(2, '0');
          const hours = String(istDate.getHours()).padStart(2, '0');
          const minutes = String(istDate.getMinutes()).padStart(2, '0');
          
          setDataDownloadDate(`${year}-${month}-${day}T${hours}:${minutes}`);
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

  // Function to save upload record
  const saveUploadRecord = async (fileName, recordsCount, downloadDate = null) => {
    try {
      // Convert local datetime to IST timestamp for database
      let downloadDateTimestamp = null;
      if (downloadDate) {
        const inputDate = new Date(downloadDate);
        // Add 5.5 hours to convert local time to proper UTC for IST storage
        const istOffset = 5.5 * 60 * 60 * 1000;
        const correctedDate = new Date(inputDate.getTime() + istOffset);
        downloadDateTimestamp = correctedDate.toISOString();
      }
      
      const { data, error } = await supabase
        .from('data_dates')
        .insert({
          file_name: fileName,
          records_count: recordsCount,
          data_download_date: downloadDateTimestamp
        })
        .select()
        .single();
      
      if (error) throw error;
      return data?.id;
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
      console.log('Saving download date:', dataDownloadDate);
      console.log('Current record ID:', currentRecordId);
      
      // Convert the datetime-local input to IST timestamp
      const inputDate = new Date(dataDownloadDate);
      console.log('Input date object:', inputDate);
      
      // Since the input is treated as local time, we need to add 5.5 hours to make it UTC
      // so that when stored and displayed, it shows the correct IST time
      const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
      const correctedDate = new Date(inputDate.getTime() + istOffset);
      const downloadDateTimestamp = correctedDate.toISOString();
      console.log('Corrected ISO timestamp:', downloadDateTimestamp);
      
      // If we have a current record ID, update it
      if (currentRecordId) {
        const { data, error } = await supabase
          .from('data_dates')
          .update({ data_download_date: downloadDateTimestamp })
          .eq('id', currentRecordId);
        
        console.log('Update result:', { data, error });
        
        if (error) throw error;
        
        setStatus(s => ({ ...s, success: 'Download date updated successfully!', error: '' }));
        
        // Refresh the upload data to show the updated date
        const { data: updatedData, error: fetchError } = await supabase
          .from('data_dates')
          .select('*')
          .eq('id', currentRecordId)
          .single();
        
        console.log('Fetched updated data:', { updatedData, fetchError });
        
        if (!fetchError && updatedData) {
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
      console.error('Save error:', error);
      setStatus(s => ({ ...s, error: 'Failed to update download date: ' + error.message }));
    }
  };

  const handleUpload = async () => {
    if (!file) return setStatus(s => ({ ...s, error: 'Please choose a CSV file.' }));
    
    // Check for duplicate uploads
    try {
      const { data: existingFile, error: checkError } = await supabase
        .from('data_dates')
        .select('file_name, records_count, upload_date')
        .eq('file_name', file.name)
        .order('upload_date', { ascending: false })
        .limit(1);
        
      if (checkError) {
        console.warn('Could not check for duplicates:', checkError);
      } else if (existingFile && existingFile.length > 0) {
        const lastUpload = existingFile[0];
        const lastUploadDate = new Date(lastUpload.upload_date).toLocaleString();
        const confirmDuplicate = window.confirm(
          `Warning: A file named "${file.name}" was already uploaded on ${lastUploadDate} with ${lastUpload.records_count} records.\n\nDo you want to upload it again? This will update existing customer records.`
        );
        
        if (!confirmDuplicate) {
          return setStatus(s => ({ ...s, error: 'Upload cancelled - duplicate file detected.' }));
        }
      }
    } catch (error) {
      console.warn('Duplicate check failed:', error);
    }
    
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
        
        // Map the CSV data to the new schema field names with error handling
        console.log('Starting to map CSV data, total rows:', data.length);
        const records = [];
        
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i];
            
            // Check for circular references or problematic data
            if (typeof row !== 'object' || row === null) {
              console.warn(`Row ${i} is not a valid object:`, row);
              continue;
            }
            
            const record = {
              "CUSTOMER CODE": row["CUSTOMER CODE"] || row["Customer Code"] || '',
              "CUSTOMER NAME": row["CUSTOMER NAME"] || row["NAME1 & 2"] || row["Customer Name"] || '',
              "HOUSE NAME": row["HOUSE NAME"] || row["House Name"] || '',
              "STREET": row["STREET"] || row["Street"] || '',
              "PLACE": row["PLACE"] || row["Place"] || '',
              "PIN CODE": row["PIN CODE"] || row["Pin Code"] || '',
              "MOBILE": row["MOBILE"] || row["Mobile"] || '',
              "NET WEIGHT": (() => {
                const weight = row["NET WEIGHT"] || row["Net Weight"];
                if (weight === null || weight === undefined || weight === '') return 0;
                const parsed = parseFloat(weight);
                return isNaN(parsed) ? 0 : parsed;
              })(),
              "LAST SALES DATE": row["LAST SALES DATE"] || row["Last Sales Date"] || '',
            };
            
            records.push(record);
            
            if (i % 10 === 0) {
              console.log(`Processed ${i + 1}/${data.length} rows`);
            }
            
          } catch (error) {
            console.error(`Error processing row ${i}:`, error, 'Row data:', data[i]);
            throw new Error(`Failed to process row ${i}: ${error.message}`);
          }
        }
        
        console.log('Successfully mapped', records.length, 'records');

        try {
          // Step 1: Upload to sales_records table in batches to avoid database stack overflow
          const BATCH_SIZE = 20; // Process 20 records at a time to avoid Supabase recursion limits
          const totalBatches = Math.ceil(records.length / BATCH_SIZE);
          
          console.log(`Uploading ${records.length} records in ${totalBatches} batches of ${BATCH_SIZE}`);
          
          for (let i = 0; i < totalBatches; i++) {
            const start = i * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, records.length);
            const batch = records.slice(start, end);
            
            console.log(`Uploading batch ${i + 1}/${totalBatches} (${batch.length} records)`);
            
            const { error: uploadError } = await supabase
              .from('sales_records')
              .upsert(batch, { onConflict: 'CUSTOMER CODE' });

            if (uploadError) {
              throw new Error(`Upload failed at batch ${i + 1}/${totalBatches}: ${uploadError.message}`);
            }
            
            // Update progress as we process each batch
            const batchProgress = Math.min(85, (i + 1) / totalBatches * 85);
            setUploadProgress(batchProgress);
            
            console.log(`Batch ${i + 1} completed successfully`);
            
            // Small delay between batches to prevent overwhelming the database
            if (i < totalBatches - 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          console.log('All batches uploaded successfully');

          setUploadProgress(90);
          setIsProcessingPoints(true);

          // Step 2: Refresh customer points (temporarily disabled due to timeout)
          // const pointsResult = await refreshCustomerPoints();
          console.log('Points calculation skipped - will run separately to avoid timeout');
          
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
              success: `Successfully uploaded ${records.length} records!`, 
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
      // Parse the UTC date and convert to IST manually
      const utcDate = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(utcDate.getTime())) {
        return 'Invalid date';
      }
      
      // Get the UTC components (which represent IST time)
      const day = utcDate.getUTCDate();
      const month = utcDate.getUTCMonth();
      const year = utcDate.getUTCFullYear();
      const hours = utcDate.getUTCHours();
      const minutes = utcDate.getUTCMinutes();
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Convert to 12-hour format
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours >= 12 ? 'pm' : 'am';
      
      const result = `${day.toString().padStart(2, '0')} ${monthNames[month]} ${year}, ${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      
      return result;
      
    } catch (error) {
      console.error('Date formatting error:', error);
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


