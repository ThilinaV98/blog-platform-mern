'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { usePostsStore } from '@/store/postsStore';
import { PostStatus, CreatePostDto, UpdatePostDto, Post } from '@/lib/api/posts';
import { toast } from 'react-hot-toast';

const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  status: z.nativeEnum(PostStatus),
  featured: z.boolean(),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }).optional(),
});

type PostFormData = z.infer<typeof postSchema>;

interface PostFormProps {
  post?: Post;
  mode: 'create' | 'edit';
}

export function PostForm({ post, mode }: PostFormProps) {
  const router = useRouter();
  const { createPost, updatePost, saveDraft, clearDraft, draft, isDirty, setDirty } = usePostsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugPreview, setSlugPreview] = useState('');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: post?.title || draft?.title || '',
      content: post?.content || draft?.content || '',
      excerpt: post?.excerpt || draft?.excerpt || '',
      category: post?.category || draft?.category || '',
      tags: post?.tags?.join(', ') || (draft?.tags?.join(', ') || ''),
      coverImage: post?.coverImage || draft?.coverImage || '',
      status: post?.status || draft?.status || PostStatus.DRAFT,
      featured: post?.featured || draft?.featured || false,
      seo: {
        metaTitle: post?.seo?.metaTitle || draft?.seo?.metaTitle || '',
        metaDescription: post?.seo?.metaDescription || draft?.seo?.metaDescription || '',
      },
    },
  });

  const watchTitle = watch('title');
  const watchContent = watch('content');

  // Generate slug preview from title
  useEffect(() => {
    if (watchTitle) {
      const slug = watchTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlugPreview(slug);
    }
  }, [watchTitle]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (mode === 'create' && isDirty) {
      const autoSaveTimer = setTimeout(() => {
        const formData = getValues();
        saveDraft({
          ...formData,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        });
        setLastAutoSave(new Date());
        toast.success('Draft saved');
      }, 30000);

      return () => clearTimeout(autoSaveTimer);
    }
  }, [isDirty, mode, getValues, saveDraft]);

  // Mark as dirty when content changes
  useEffect(() => {
    if (mode === 'create') {
      setDirty(true);
    }
  }, [watchTitle, watchContent, mode, setDirty]);

  const onSubmit = async (data: PostFormData) => {
    setIsSubmitting(true);
    try {
      const postData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
        coverImage: data.coverImage || undefined,
      };

      if (mode === 'create') {
        const newPost = await createPost(postData as CreatePostDto);
        clearDraft();
        toast.success('Post created successfully!');
        
        if (data.status === PostStatus.PUBLISHED) {
          router.push(`/blog/${newPost.slug}`);
        } else {
          router.push('/dashboard/posts');
        }
      } else if (post) {
        await updatePost(post._id, postData as UpdatePostDto);
        toast.success('Post updated successfully!');
        router.push('/dashboard/posts');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    const formData = getValues();
    setIsSubmitting(true);
    try {
      const postData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        status: PostStatus.DRAFT,
        coverImage: formData.coverImage || undefined,
      };
      
      const newPost = await createPost(postData as CreatePostDto);
      clearDraft();
      toast.success('Draft saved successfully!');
      router.push('/dashboard/posts');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = () => {
    setValue('status', PostStatus.PUBLISHED);
    handleSubmit(onSubmit)();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          {...register('title')}
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Enter post title..."
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
        {slugPreview && (
          <p className="mt-1 text-sm text-gray-500">
            Slug: <span className="font-mono">{slugPreview}</span>
          </p>
        )}
      </div>

      {/* Content Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content
        </label>
        <RichTextEditor
          content={watch('content')}
          onChange={(content) => setValue('content', content)}
          placeholder="Write your post content..."
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
        )}
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Excerpt (Optional)
        </label>
        <textarea
          {...register('excerpt')}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Brief description of your post..."
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <input
            {...register('category')}
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Technology"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (comma-separated)
          </label>
          <input
            {...register('tags')}
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., javascript, react, nextjs"
          />
        </div>
      </div>

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cover Image URL (Optional)
        </label>
        <input
          {...register('coverImage')}
          type="url"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      {/* SEO Fields */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">SEO Settings (Optional)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Title
            </label>
            <input
              {...register('seo.metaTitle')}
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="SEO optimized title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Description
            </label>
            <textarea
              {...register('seo.metaDescription')}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="SEO optimized description"
            />
          </div>
        </div>
      </div>

      {/* Featured Post */}
      <div className="flex items-center">
        <input
          {...register('featured')}
          type="checkbox"
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
        <label className="ml-2 text-sm font-medium text-gray-700">
          Mark as featured post
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="text-sm text-gray-500">
          {lastAutoSave && (
            <span>Auto-saved at {lastAutoSave.toLocaleTimeString()}</span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/posts')}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          {mode === 'create' && (
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Save Draft
            </button>
          )}
          <button
            type="button"
            onClick={handlePublish}
            className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Publish' : 'Update'}
          </button>
        </div>
      </div>
    </form>
  );
}