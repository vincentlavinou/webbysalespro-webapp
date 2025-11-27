import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Calendar } from 'lucide-react';

type WaitingRoomShimmerProps = {
  /** What we're waiting for, e.g. "Connecting to live webinar..." */
  title?: string;
};

export default function WaitingRoomShimmer({
  title = 'Preparing your experience...',
}: WaitingRoomShimmerProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 animate-pulse">
      <div className="w-full max-w-2xl md:min-w-3xl lg:max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="h-5 w-5 text-blue-300" />
              <Badge
                variant="secondary"
                className="text-xs md:text-sm bg-gray-200 text-gray-500 border-gray-200"
              >
                Waiting…
              </Badge>
            </div>

            {/* Title from props */}
            <CardTitle className="text-xl md:text-2xl font-semibold text-gray-700">
              {title}
            </CardTitle>

            {/* Subtitle shimmer */}
            <div className="mt-2 h-4 w-1/2 mx-auto rounded bg-gray-200" />
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Countdown */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
              <div className="text-sm text-blue-300 font-medium mb-1 h-4 w-24 mx-auto rounded bg-blue-100" />
              <div className="text-2xl font-bold text-blue-200 font-mono h-8 w-32 mx-auto rounded bg-blue-100" />
            </div>

            {/* Session Details */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-200" />
                <div>
                  <div className="font-medium text-gray-300 h-4 w-24 rounded bg-gray-200" />
                  <div className="text-sm text-gray-200 h-4 w-32 mt-1 rounded bg-gray-200" />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-gray-200" />
                <div>
                  <div className="font-medium text-gray-300 h-4 w-20 rounded bg-gray-200" />
                  <div className="text-sm text-gray-200 h-4 w-40 mt-1 rounded bg-gray-200" />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Badge
                  variant="outline"
                  className="text-xs bg-gray-200 border-gray-200 text-gray-300 h-5 w-16"
                />
                <div className="text-sm text-gray-200 h-4 w-24 rounded bg-gray-200" />
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-200 rounded-full mt-2" />
                </div>
                <div>
                  <div className="font-medium text-gray-300 h-4 w-40 rounded bg-gray-200" />
                  <div className="text-sm text-gray-200 h-4 w-64 mt-1 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
