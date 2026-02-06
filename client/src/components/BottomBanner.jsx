import React from 'react'
import { assets, features } from '../assets/assets'

const BottomBanner = () => {
  return (
    <div className='relative mt-24'>
        <img src={assets.bottom_banner_image} alt="banner" className='w-full hidden md:block'/>
        <img src={assets.bottom_banner_image_sm} alt="banner" className='w-full md:hidden'/>
        <div className='absolute inset-0 flex flex-col items-center md:items-end justify-start pt-12 md:justify-center px-6 md:pr-6 lg:pr-8 xl:pr-10'>
          <div className='w-full md:w-auto max-w-md md:max-w-sm lg:max-w-md xl:max-w-lg'>
            <h1 className='text-2xl md:text-2xl lg:text-3xl xl:text-3xl font-semibold text-primary-dull/50 mt-5 mb-10 md:mt-0 md:mb-5 lg:mb-6 text-center md:text-left'>
              ¿Por Qué Somos Los Mejores?</h1>
            <div className='space-y-4 md:space-y-2.5 lg:space-y-3'>
              {features.map((feature, index)=>(
                <div key={index} className='flex items-start md:items-center gap-3 md:gap-3 lg:gap-3.5'>
                  <img src={feature.icon} alt="Feature Icon" className='w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 flex-shrink-0 mt-1 md:mt-0'/>
                  <div className='flex-1'>
                    <h3 className='text-base md:text-base lg:text-lg font-semibold text-gray-800'>{feature.title}</h3>
                    <p className='text-gray-600 text-xs md:text-xs lg:text-sm mt-0.5'>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
    </div>
  )
}

export default BottomBanner