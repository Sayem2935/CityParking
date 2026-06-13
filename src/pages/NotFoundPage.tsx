import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components';
import { Home, ParkingSquare } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="text-center animate-fade-in">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-zinc-800 mx-auto mb-8">
          <ParkingSquare className="w-12 h-12 text-zinc-500" />
        </div>
        <h1 className="text-6xl font-bold text-zinc-100 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-zinc-300 mb-2">Parking Spot Not Found</h2>
        <p className="text-zinc-500 mb-8 max-w-md mx-auto">
          The page you're looking for seems to have driven off. 
          Let's get you back to the dashboard.
        </p>
        <Link to="/dashboard">
          <Button size="lg">
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;