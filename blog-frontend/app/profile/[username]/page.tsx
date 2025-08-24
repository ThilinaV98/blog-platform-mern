'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { usersAPI, UserProfile, UserPost } from '@/lib/api/users';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      fetchProfileData();
    }
  }, [username]);

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch user profile
      const profileData = await usersAPI.getPublicProfile(username);
      setProfile(profileData);
      
      // Fetch user posts
      const postsData = await usersAPI.getUserPosts(username);
      setPosts(postsData.posts);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile. User may not exist.');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (profile?.profile?.avatar) {
      if (profile.profile.avatar.startsWith('/')) {
        return `${process.env.NEXT_PUBLIC_API_URL}${profile.profile.avatar}`;
      }
      return profile.profile.avatar;
    }
    return null;
  };

  const getInitials = () => {
    return profile?.username?.charAt(0).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
        <p className="text-gray-600 mb-8">{error || 'The user you are looking for does not exist.'}</p>
        <Link
          href="/"
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {getAvatarUrl() ? (
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden">
                  <Image
                    src={getAvatarUrl()!}
                    alt={profile.username}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-semibold text-primary-600">
                    {getInitials()}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-900">
                {profile.profile?.displayName || profile.username}
              </h1>
              <p className="text-lg text-gray-600">@{profile.username}</p>
              
              {profile.profile?.bio && (
                <p className="mt-3 text-gray-700 max-w-2xl">{profile.profile.bio}</p>
              )}

              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-gray-600">
                {profile.profile?.location && (
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {profile.profile.location}
                  </div>
                )}
                
                {profile.profile?.website && (
                  <a
                    href={profile.profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-primary-600"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Website
                  </a>
                )}
                
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Social Links */}
              {profile.profile?.socialLinks && (
                <div className="mt-4 flex justify-center sm:justify-start space-x-4">
                  {profile.profile.socialLinks.twitter && (
                    <a
                      href={`https://twitter.com/${profile.profile.socialLinks.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-primary-600"
                      title="Twitter"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                  )}
                  
                  {profile.profile.socialLinks.github && (
                    <a
                      href={`https://github.com/${profile.profile.socialLinks.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-primary-600"
                      title="GitHub"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </a>
                  )}
                  
                  {profile.profile.socialLinks.linkedin && (
                    <a
                      href={`https://linkedin.com/in/${profile.profile.socialLinks.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-primary-600"
                      title="LinkedIn"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Posts by {profile.username}</h2>
        
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post._id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                {post.coverImage && (
                  <div className="relative h-48 rounded-t-lg overflow-hidden">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-primary-600"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{post.metadata.readTime} min read</span>
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {post.metadata.likes}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {post.metadata.comments}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No posts published yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}