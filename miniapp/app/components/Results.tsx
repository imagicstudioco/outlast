"use client";

import { Card } from "./Card";
import { Button } from "./Button";

interface ResultsProps {
  setActiveTabAction: (tab: string) => void;
}

export const Results: React.FC<ResultsProps> = ({ setActiveTabAction }) => {
  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Voting Results</h1>
        <p className="text-gray-600">
          See how the voting is going
        </p>
      </div>

      {/* Results Content */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Current Results</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg mb-4">
            Results will be displayed here once voting is complete
          </p>
          <Button
            onClick={() => setActiveTabAction("home")}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Back to Finalists
          </Button>
        </div>
      </Card>
    </div>
  );
};