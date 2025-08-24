'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { commentsAPI, CommentReport } from '@/lib/api/comments';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';


export default function ReportsPage() {
  const [reports, setReports] = useState<CommentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await commentsAPI.getReports(1, 20);
        setReports(response.data);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
        toast.error('Failed to load reports');
        setReports([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleDismissReport = async (reportId: string) => {
    try {
      await commentsAPI.dismissReport(reportId);
      toast.success('Report dismissed');
      setReports(prev => prev.filter(report => report._id !== reportId));
    } catch (error) {
      console.error('Failed to dismiss report:', error);
      toast.error('Failed to dismiss report');
    }
  };

  const handleDeleteComment = async (commentId: string, reportId: string) => {
    try {
      // Delete the comment using the existing API
      await commentsAPI.deleteCommentAsAdmin(commentId);
      toast.success('Comment deleted and report resolved');
      setReports(prev => prev.filter(report => report._id !== reportId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const getCategoryColor = (reason: string) => {
    if (reason.startsWith('spam')) return 'bg-yellow-100 text-yellow-800';
    if (reason.startsWith('harassment')) return 'bg-red-100 text-red-800';
    if (reason.startsWith('inappropriate')) return 'bg-orange-100 text-orange-800';
    if (reason.startsWith('misinformation')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getCategory = (reason: string) => {
    const colonIndex = reason.indexOf(':');
    return colonIndex > -1 ? reason.substring(0, colonIndex) : 'other';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-lg">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Comment Reports</h1>
          <p className="text-gray-600 mt-2">
            Review and manage reported comments from the community.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {reports.length} Pending Reports
          </Badge>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reports to Review</h3>
            <p className="text-gray-600 text-center">
              Great! There are no pending comment reports at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report._id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Report #{report._id.slice(-6)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Reported by <strong>@{report.reporterId.username}</strong> on{' '}
                      {new Date(report.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge className={getCategoryColor(report.reason)}>
                    {getCategory(report.reason)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Report Reason */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-1">Report Reason:</h4>
                  <p className="text-sm bg-gray-50 p-3 rounded border-l-4 border-orange-400">
                    {report.reason}
                  </p>
                </div>

                {/* Comment Details */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Reported Comment:</h4>
                  <div className="bg-gray-50 p-4 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">
                          @{report.commentId.userId.username}
                        </span>
                        {report.commentId.userId.profile?.displayName && (
                          <span>({report.commentId.userId.profile.displayName})</span>
                        )}
                        <span>•</span>
                        <span>on "{report.commentId.postId.title}"</span>
                      </div>
                    </div>
                    <p className="text-sm">{report.commentId.content}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Comment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the comment and resolve the report. 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteComment(report.commentId._id, report._id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Comment
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDismissReport(report._id)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Dismiss Report
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.open(`/blog/${report.commentId.postId.slug}#comment-${report.commentId._id}`, '_blank')}
                  >
                    View in Context
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}