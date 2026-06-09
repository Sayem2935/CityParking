import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4">
      <div className="text-center animate-fade-in">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-city-blue-50 mx-auto mb-8">
          <span className="text-5xl">🚗</span>
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Parking Spot Not Found</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          The page you're looking for seems to have driven off. 
          Let's get you back to the dashboard.
        </p>
        <Link to="/dashboard">
          <Button size="lg">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;