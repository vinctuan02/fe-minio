import React, { useState } from "react";
import axios from "axios";
import "./minio-api.css";

const MinioAPI = () => {
  const [file, setFile] = useState(null);
  const [bucketName, setBucketName] = useState("");
  const [objectName, setObjectName] = useState("");
  const [contentType, setContentType] = useState(""); // Content type for file
  const [uploadUrl, setUploadUrl] = useState("");
  const [readUrl, setReadUrl] = useState(""); // To store the read URL
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Progress percentage
  const [uploadSpeed, setUploadSpeed] = useState(0); // Speed in KB/s

  // Handle file input change
  const onFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    // Automatically set filename and contentType based on selected file
    if (selectedFile) {
      setObjectName(selectedFile.name); // filename
      setContentType(selectedFile.type); // contentType
    }
  };

  // Get presigned upload URL
  const getPresignedUploadUrl = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8081/minio/presigned-upload",
        {
          params: {
            fileName: objectName,
            bucketName: bucketName,
            contentType: contentType, // Send contentType
          },
        }
      );
      console.log("Presigned URL Response:", response.data); // Log phản hồi để kiểm tra
      if (response.data) {
        setUploadUrl(response.data); // Lưu URL nếu có dữ liệu
      } else {
        console.error("No URL returned from the server.");
        alert("No upload URL returned from the server.");
      }
    } catch (error) {
      console.error("Error getting presigned upload URL:", error);
      alert("Failed to get a valid upload URL.");
    }
  };

  // Upload file to presigned URL
  const handleUpload = async () => {
    if (!file || !bucketName) {
      alert("Please select a file and provide a valid bucket name.");
      return;
    }

    setUploading(true);

    try {
      // 1. Lấy presigned upload URL
      const response = await axios.get(
        "http://localhost:8081/minio/presigned-upload",
        {
          params: {
            fileName: file.name, // Sử dụng tên file đã chọn
            bucketName: bucketName,
            contentType: file.type, // Sử dụng contentType của file
          },
        }
      );

      const uploadUrl = response.data; // URL upload nhận được từ API

      if (!uploadUrl) {
        alert("Failed to get a valid upload URL.");
        setUploading(false);
        return;
      }

      // 2. Upload file lên presigned URL
      const formData = new FormData();
      formData.append("file", file);

      const startTime = Date.now();

      // 3. Thực hiện upload và theo dõi tiến trình
      await axios.put(uploadUrl, formData, {
        headers: {
          "Content-Type": file.type, // Đảm bảo content-type đúng
        },
        onUploadProgress: (progressEvent) => {
          const { loaded, total } = progressEvent;
          const progress = (loaded / total) * 100; // Tính phần trăm tải lên
          setUploadProgress(progress);

          // Tính tốc độ tải lên (KB/s)
          const elapsedTime = (Date.now() - startTime) / 1000; // Thời gian đã trôi qua (giây)
          const speed = loaded / elapsedTime / 1024; // Tốc độ (KB/s)
          setUploadSpeed(speed.toFixed(2)); // Hiển thị tốc độ tải lên
        },
      });

      alert("File uploaded successfully!");

      // Sau khi upload xong, có thể lấy presigned URL để đọc file nếu cần
      getPresignedReadUrl();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload the file.");
    } finally {
      setUploading(false);
    }
  };

  // Get presigned read URL
  const getPresignedReadUrl = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8081/minio/presigned-read",
        {
          params: {
            fileName: objectName,
            bucketName: bucketName,
          },
        }
      );
      const readUrl = response.data.url;
      // Lưu lại URL đọc file
      setReadUrl(readUrl);
      console.log("Read URL: ", readUrl);
    } catch (error) {
      console.error("Error getting presigned read URL:", error);
    }
  };

  return (
    <div className="minio-api-container">
      <h1>Minio Upload API Test</h1>

      <div className="input-section">
        <input
          type="text"
          placeholder="Bucket Name"
          value={bucketName}
          onChange={(e) => setBucketName(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Object Name"
          value={objectName}
          onChange={(e) => setObjectName(e.target.value)}
          className="input-field"
          disabled
        />
        <input
          type="text"
          placeholder="Content Type"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="input-field"
          disabled
        />
        <button onClick={getPresignedUploadUrl} className="get-url-button">
          Get Upload URL
        </button>
      </div>

      <div className="file-upload-section">
        <input type="file" onChange={onFileChange} className="file-input" />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="upload-button"
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>
      </div>

      {uploading && (
        <div className="upload-progress">
          <p>Upload Progress: {Math.round(uploadProgress)}%</p>
          <p>Upload Speed: {uploadSpeed} KB/s</p>
        </div>
      )}

      {readUrl && (
        <div className="read-file-section">
          <button onClick={() => window.open(readUrl)} className="view-button">
            View File
          </button>
          {/* If it's an image, display it directly */}
          <div className="file-preview">
            <img src={readUrl} alt="Uploaded file" style={{ width: "300px" }} />
          </div>
          {/* If it's a video, display it directly */}
          {contentType.startsWith("video") && (
            <video width="300" controls>
              <source src={readUrl} type={contentType} />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      )}
    </div>
  );
};

export default MinioAPI;
