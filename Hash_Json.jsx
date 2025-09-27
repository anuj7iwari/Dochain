import React, { useState, useCallback, useMemo } from 'react';

const App = () => {
  const [targetFile, setTargetFile] = useState(null);
  const [processingState, setProcessingState] = useState('idle');
  const [outputPayload, setOutputPayload] = useState(null);
  const [cryptographicKey, setCryptographicKey] = useState(null);

  const bufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    let binary = '';
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const generateDummyKey = useCallback(async (fileName) => {
    try {
      const key = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      );
      setCryptographicKey(key);
      const jwkKey = await window.crypto.subtle.exportKey("jwk", key);
      return {
        keyId: `KID-${jwkKey.k.slice(0, 10)}`,
        derivationSalt: btoa(fileName).slice(0, 16),
        algorithm: 'AES-256-GCM-HKDF'
      };
    } catch (e) {
      console.error("Key generation simulation failed:", e);
      return {
        keyId: 'KID-ERROR',
        derivationSalt: 'SALT-ERROR',
        algorithm: 'FALLBACK-SIM-RSA'
      };
    }
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setTargetFile(file);
      setOutputPayload(null);
      setProcessingState('ready');
    }
  };

  const processDocument = async () => {
    if (!targetFile) return;

    setProcessingState('deriving_key');

    const dummyBuffer = new ArrayBuffer(targetFile.size || 1024); 
    
    const encryptionKeyMetadata = await generateDummyKey(targetFile.name);

    setProcessingState('encrypting');

    await new Promise(resolve => setTimeout(resolve, 1500)); 

    const fileBase64 = bufferToBase64(dummyBuffer);
    const encryptedPayload = fileBase64 + Math.random().toString(36).substring(2, 15); 

    const finalPayload = {
      manifest_version: '3.1.4_ALPHA',
      document_metadata: {
        original_name: targetFile.name,
        mime_type: targetFile.type,
        size_bytes: targetFile.size,
        last_modified_ts: targetFile.lastModified,
        hash_integrity: `SHA256:${btoa(targetFile.name).slice(0, 32)}`,
        simulated_blockchains: ['btc', 'eth', 'cosmos', 'osmosis'],
      },
      cryptographic_header: encryptionKeyMetadata,
      payload_container: {
        encoding_format: 'BASE64_PAYLOAD_V2',
        initialization_vector: Array(12).fill(0).map(() => Math.floor(Math.random() * 255)).join('-'),
        encrypted_data_block: encryptedPayload.slice(0, 512) + '...', 
        payload_checksum: 'CRC32:' + (targetFile.size % 99999),
      },
      processing_status: 'COMPLETE_SUCCESS',
      timestamp_ms: Date.now()
    };

    setOutputPayload(finalPayload);
    setProcessingState('complete');
  };

  const isProcessing = processingState !== 'idle' && processingState !== 'ready' && processingState !== 'complete';

  const JsonDisplay = useMemo(() => {
    if (!outputPayload) return null;

    return (
      <pre className="bg-gray-800 text-green-400 p-4 rounded-xl overflow-x-auto text-sm shadow-inner mt-4">
        <code>{JSON.stringify(outputPayload, null, 2)}</code>
      </pre>
    );
  }, [outputPayload]);


  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-2xl bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl border border-blue-600/50">
        <h1 className="text-3xl font-extrabold text-white mb-2 text-center">
          Multi-Chain Document Ingester
        </h1>
        <p className="text-gray-400 mb-6 text-center">
          (Simulated Cryptographic JSON Transformation Utility)
        </p>

        <div className="mb-6 space-y-4">
          <label className="block text-lg font-medium text-blue-400">
            Select Document (.pdf, .zip, .code, .word)
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-500 file:text-white
              hover:file:bg-blue-600 cursor-pointer transition duration-200"
          />
          {targetFile && (
            <p className="text-sm text-gray-500 mt-2">
              File selected: <span className="text-white font-mono">{targetFile.name}</span> ({Math.round(targetFile.size / 1024)} KB)
            </p>
          )}
        </div>

        <button
          onClick={processDocument}
          disabled={!targetFile || isProcessing}
          className={`w-full py-3 rounded-xl font-bold text-lg transition duration-300 shadow-lg
            ${isProcessing
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
            }`}
        >
          {processingState === 'idle' && 'Load File to Begin'}
          {processingState === 'ready' && 'Execute Multi-Stage Ingestion'}
          {processingState === 'deriving_key' && 'Deriving Key & Hashing...'}
          {processingState === 'encrypting' && 'Encrypting & Structuring Payload...'}
          {processingState === 'complete' && 'Re-Ingest New Document'}
        </button>

        {isProcessing && (
          <div className="mt-4 flex items-center justify-center text-blue-400">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-semibold">{processingState.replace('_', ' ').toUpperCase()}...</span>
          </div>
        )}

        {outputPayload && (
          <div className="mt-6 border-t pt-4 border-gray-700">
            <h2 className="text-xl font-bold text-white mb-2">
              Generated JSON Artifact
            </h2>
            <p className="text-sm text-yellow-500 mb-2">
              (This structure is the result of the complex cryptographic conversion process.)
            </p>
            {JsonDisplay}
          </div>
        )}

        {cryptographicKey && (
            <p className="text-xs text-blue-500 mt-4 text-center">
                *Cryptographic key object successfully generated in memory for processing.
            </p>
        )}
      </div>
    </div>
  );
};

export default App;
