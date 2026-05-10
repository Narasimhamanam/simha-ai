function DocumentsPage({ theme }) {

  const dark = theme === "dark";

  return (

    <div className="
      flex-1
      flex
      items-center
      justify-center
    ">

      <div className="text-center">

        <h1 className="
          text-5xl
          font-bold
          text-purple-500
          mb-6
        ">
          Documents
        </h1>

        <p className={`
          text-xl

          ${dark
            ? "text-gray-400"
            : "text-gray-600"}
        `}>

          Uploaded PDFs and document
          analysis will appear here.

        </p>

      </div>

    </div>

  );

}

export default DocumentsPage;