'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import ExploreCards from '@/components/ExploreCards'
import Footer from '@/components/Footer'

interface CategoryPageProps {
    params: {
        category: string
    }
}

const categoryInfo: Record<string, { title: string, description: string }> = {
    love: {
        title: "Love Letters with Music",
        description: "Explore romantic handwritten letters paired with meaningful songs. Whether it's a first crush, a long-distance relationship, or a lifelong partnership, find the music that captures the essence of love."
    },
    friendship: {
        title: "Friendship Letters with Music",
        description: "Discover messages of appreciation and shared memories between friends. Celebrate the special bond that only true friendship can provide, all set to the perfect soundtrack."
    },
    family: {
        title: "Family Letters with Music",
        description: "Heartfelt letters to parents, siblings, and relatives that bridge the distance. Express your gratitude, share your love, and keep family connections strong through the power of music."
    }
}

export default function CategoryPage({ params }: CategoryPageProps) {
    const category = params.category.toLowerCase()
    const info = categoryInfo[category] || {
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Letters`,
        description: `Explore ${category} letters paired with music.`
    }

    // Map URL category to DB category (capitalized)
    const dbCategory = category.charAt(0).toUpperCase() + category.slice(1)

    return (
        <main>
            <Header currentPage="explore" />
            <div className="explore-container">
                <div className="explore-header" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{info.title}</h1>
                    <p style={{ maxWidth: '600px', margin: '0 auto', color: '#666', lineHeight: '1.6' }}>
                        {info.description}
                    </p>
                </div>

                <ExploreCards category={dbCategory} />
            </div>
            <Footer />
        </main>
    )
}
