export default function LoadingSpinner() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      data-testid="loading-container"
    >
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4 border-primary"
          data-testid="loading-spinner"
        ></div>
        <p className="text-text-primary text-lg font-body">Loading...</p>
      </div>
    </div>
  );
}
