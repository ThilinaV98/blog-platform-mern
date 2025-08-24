'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePostsStore } from '@/store/postsStore';
import { PostStatus } from '@/lib/api/posts';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Clock,
  Tag,
  MoreVertical,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { getImageUrl } from '@/lib/utils/image';

export default function PostsPage() {
  const router = useRouter();
  const { 
    posts, 
    fetchMyPosts, 
    deletePost, 
    publishPost,
    archivePost,
    unarchivePost,
    isLoading,
    currentPage,
    totalPages,
    hasNext,
    hasPrev
  } = usePostsStore();
  
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState<'publish' | 'archive' | 'delete' | null>(null);

  useEffect(() => {
    const params: any = { page: currentPage };
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    fetchMyPosts(params);
  }, [fetchMyPosts, statusFilter, currentPage]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.post-menu-container')) {
        setActiveMenu(null);
      }
    };

    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [activeMenu]);

  const refreshPosts = () => {
    const params: any = { page: currentPage };
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    fetchMyPosts(params);
  };

  const handleDelete = async (postId: string) => {
    try {
      await deletePost(postId);
      toast.success('Post deleted successfully');
      setShowDeleteModal(null);
      refreshPosts();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const handlePublish = async (postId: string) => {
    try {
      await publishPost(postId);
      toast.success('Post published successfully');
      refreshPosts();
    } catch (error) {
      toast.error('Failed to publish post');
    }
  };


  const handleArchive = async (postId: string) => {
    try {
      await archivePost(postId);
      toast.success('Post archived successfully');
      refreshPosts();
    } catch (error) {
      toast.error('Failed to archive post');
    }
  };

  const handleUnarchive = async (postId: string) => {
    try {
      await unarchivePost(postId);
      toast.success('Post unarchived successfully');
      refreshPosts();
    } catch (error) {
      toast.error('Failed to unarchive post');
    }
  };

  // Bulk operations handlers
  const handleSelectAll = () => {
    if (selectedPosts.length === posts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(posts.map(p => p._id));
    }
  };

  const handleSelectPost = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedPosts.length === 0) return;

    try {
      const promises = selectedPosts.map(postId => {
        switch (bulkAction) {
          case 'publish':
            return publishPost(postId);
          case 'archive':
            return archivePost(postId);
          case 'delete':
            return deletePost(postId);
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      
      toast.success(`Successfully ${bulkAction}ed ${selectedPosts.length} posts`);
      setSelectedPosts([]);
      setBulkAction(null);
      setShowBulkActions(false);
      refreshPosts();
    } catch (error) {
      toast.error(`Failed to ${bulkAction} posts`);
    }
  };

  useEffect(() => {
    setShowBulkActions(selectedPosts.length > 0);
  }, [selectedPosts]);

  const getStatusBadge = (status: PostStatus) => {
    const styles = {
      [PostStatus.DRAFT]: 'bg-gray-100 text-gray-700',
      [PostStatus.PUBLISHED]: 'bg-green-100 text-green-700',
      [PostStatus.ARCHIVED]: 'bg-yellow-100 text-yellow-700',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Posts</h1>
          <p className="mt-2 text-gray-600">Manage your blog posts</p>
        </div>
        <Link
          href="/dashboard/posts/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          New Post
        </Link>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedPosts([])}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkAction('publish');
                handleBulkAction();
              }}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Publish Selected
            </button>
            <button
              onClick={() => {
                setBulkAction('archive');
                handleBulkAction();
              }}
              className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
            >
              Archive Selected
            </button>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedPosts.length} posts?`)) {
                  setBulkAction('delete');
                  handleBulkAction();
                }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            statusFilter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300'
          }`}
        >
          All Posts
        </button>
        <button
          onClick={() => setStatusFilter(PostStatus.PUBLISHED)}
          className={`px-4 py-2 rounded-lg ${
            statusFilter === PostStatus.PUBLISHED
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300'
          }`}
        >
          Published
        </button>
        <button
          onClick={() => setStatusFilter(PostStatus.DRAFT)}
          className={`px-4 py-2 rounded-lg ${
            statusFilter === PostStatus.DRAFT
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300'
          }`}
        >
          Drafts
        </button>
        <button
          onClick={() => setStatusFilter(PostStatus.ARCHIVED)}
          className={`px-4 py-2 rounded-lg ${
            statusFilter === PostStatus.ARCHIVED
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300'
          }`}
        >
          Archived
        </button>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-4">No posts found</p>
          <Link
            href="/dashboard/posts/new"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
          >
            <Plus className="w-5 h-5" />
            Create your first post
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Table Header with Select All */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedPosts.length === posts.length && posts.length > 0}
                onChange={handleSelectAll}
                className="mr-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Select all posts
              </span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {posts.map((post) => (
              <div key={post._id} className="p-6 hover:bg-gray-50 relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(post._id)}
                      onChange={() => handleSelectPost(post._id)}
                      className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {post.coverImage && (
                        <img
                          src={getImageUrl(post.coverImage)}
                          alt={post.title}
                          className="w-24 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {post.metadata.readTime} min read
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {post.metadata.views} views
                          </span>
                          {post.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="w-4 h-4" />
                              {post.tags.slice(0, 3).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                  <div className="flex items-center gap-3 ml-4">
                    {getStatusBadge(post.status)}
                    <div className="relative post-menu-container">
                      <button
                        onClick={() => setActiveMenu(activeMenu === post._id ? null : post._id)}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                      {activeMenu === post._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                          <Link
                            href={`/dashboard/posts/${post._id}/edit`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </Link>
                          {post.status === PostStatus.PUBLISHED ? (
                            <>
                              <Link
                                href={`/blog/${post.slug}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </Link>
                              <button
                                onClick={() => handleArchive(post._id)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                <Archive className="w-4 h-4" />
                                Archive
                              </button>
                            </>
                          ) : post.status === PostStatus.ARCHIVED ? (
                            <>
                              <button
                                onClick={() => handleUnarchive(post._id)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                <ArchiveRestore className="w-4 h-4" />
                                Unarchive
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handlePublish(post._id)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                <Eye className="w-4 h-4" />
                                Publish
                              </button>
                              <button
                                onClick={() => handleArchive(post._id)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                <Archive className="w-4 h-4" />
                                Archive
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setShowDeleteModal(post._id)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => fetchMyPosts({ page: currentPage - 1 })}
                disabled={!hasPrev}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => fetchMyPosts({ page: currentPage + 1 })}
                disabled={!hasNext}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Post</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}