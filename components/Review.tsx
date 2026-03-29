import { FaStar } from 'react-icons/fa';

interface ReviewProps {
  rating: number;
  title: string;
  content: string;
  author: string;
  designation: string;
}

const Review: React.FC<ReviewProps> = ({
  rating = 5,
  title = 'Default Title',
  content = 'Default content for the review.',
  author = 'John Doe',
  designation = 'Customer',
}) => {
  return (
    <div className="bg-surface-low p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-2">
        {[...Array(5)].map((_, i) => (
          <FaStar
            key={i}
            className={`w-5 h-5 ${i < rating ? 'text-green-500' : 'text-text-secondary'}`}
          />
        ))}
      </div>
      <h3 className="text-xl mb-2 text-text-primary">{title}</h3>
      <p className="text-text-secondary mb-4 font-light">{content}</p>
      <div className="flex items-center">
        <div>
          <p className="text-text-primary">{author}</p>
          <p className="text-sm text-text-secondary font-light">{designation}</p>
        </div>
      </div>
    </div>
  );
};

export default Review;
