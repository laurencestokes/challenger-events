export default function LoadingSpinner() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0F0F0F' }}
      data-testid="loading-container"
    >
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4"
          style={{ borderColor: '#4682B4' }}
          data-testid="loading-spinner"
        ></div>
        <p className="text-white text-lg">Loading...</p>
      </div>
    </div>
  );
}
