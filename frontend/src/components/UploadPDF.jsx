import axios from "axios";

function UploadPDF() {

  const handleUpload = async (e) => {

    const file = e.target.files[0];

    const formData = new FormData();

    formData.append("file", file);

    await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/upload-pdf`,
      formData
    );

    alert("PDF Uploaded Successfully");
  };

  return (
    <div className="p-4 border-b border-slate-700">

      <input
        type="file"
        accept=".pdf"
        onChange={handleUpload}
      />

    </div>
  );
}

export default UploadPDF;