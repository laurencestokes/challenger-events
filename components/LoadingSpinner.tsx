export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" data-testid="loading-container">
      <div
        className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"
        data-testid="loading-spinner"
      ></div>
    </div>
  );
}
