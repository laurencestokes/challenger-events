export default function LoadingSpinner() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900"
      data-testid="loading-container"
    >
      <div
        className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"
        data-testid="loading-spinner"
      ></div>
    </div>
  );
}
