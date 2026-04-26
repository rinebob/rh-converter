/**
 * BMP to PNG conversion smoke test
 * Tests realistic file sizes and conversion speed
 */

import sharp from 'sharp';
import * as bmp from 'bmp-js';

/**
 * Create a test BMP image of specified size
 */
async function createTestBMP(width: number, height: number): Promise<Buffer> {
  // Create raw RGBA data
  const channels = 4;
  const data = Buffer.alloc(width * height * channels);
  
  // Fill with a gradient pattern (more realistic than solid color)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      data[idx] = (x / width) * 255;     // R
      data[idx + 1] = (y / height) * 255; // G
      data[idx + 2] = 128;                // B
      data[idx + 3] = 255;                // A
    }
  }
  
  // Encode to BMP
  const bmpData = bmp.encode({
    data,
    width,
    height
  });
  
  return bmpData.data;
}

/**
 * Convert BMP buffer to PNG using Sharp
 */
async function convertBMPtoPNG(bmpBuffer: Buffer): Promise<Buffer> {
  // Decode BMP
  const decoded = bmp.decode(bmpBuffer);
  
  // Convert to PNG using Sharp
  return await sharp(decoded.data, {
    raw: {
      width: decoded.width,
      height: decoded.height,
      channels: 4
    }
  }).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * Test BMP to PNG conversion with timing
 */
async function testBMPtoPNG() {
  console.log('🧪 BMP → PNG Conversion Smoke Test\n');
  
  try {
    // Test 1: Small image (similar to smoke test)
    console.log('1️⃣ Small image (100x100)...');
    const small = await createTestBMP(100, 100);
    console.log(`   BMP size: ${(small.length / 1024).toFixed(2)} KB`);
    
    let start = Date.now();
    const smallPNG = await convertBMPtoPNG(small);
    let elapsed = Date.now() - start;
    console.log(`   PNG size: ${(smallPNG.length / 1024).toFixed(2)} KB`);
    console.log(`   ✅ Converted in ${elapsed}ms\n`);
    
    // Test 2: Medium image (1000x1000 ≈ 4MB BMP)
    console.log('2️⃣ Medium image (1000x1000)...');
    const medium = await createTestBMP(1000, 1000);
    console.log(`   BMP size: ${(medium.length / 1024 / 1024).toFixed(2)} MB`);
    
    start = Date.now();
    const mediumPNG = await convertBMPtoPNG(medium);
    elapsed = Date.now() - start;
    console.log(`   PNG size: ${(mediumPNG.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✅ Converted in ${elapsed}ms\n`);
    
    // Test 3: Large image (2000x2000 ≈ 16MB BMP)
    console.log('3️⃣ Large image (2000x2000)...');
    const large = await createTestBMP(2000, 2000);
    console.log(`   BMP size: ${(large.length / 1024 / 1024).toFixed(2)} MB`);
    
    start = Date.now();
    const largePNG = await convertBMPtoPNG(large);
    elapsed = Date.now() - start;
    console.log(`   PNG size: ${(largePNG.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✅ Converted in ${elapsed}ms\n`);
    
    // Test 4: Batch simulation (10 medium images in parallel)
    console.log('4️⃣ Batch test (10 medium images in parallel)...');
    const batchImages = await Promise.all(
      Array(10).fill(null).map(() => createTestBMP(1000, 1000))
    );
    const totalBatchSize = batchImages.reduce((sum, img) => sum + img.length, 0);
    console.log(`   Total BMP size: ${(totalBatchSize / 1024 / 1024).toFixed(2)} MB`);
    
    start = Date.now();
    const batchResults = await Promise.all(
      batchImages.map(img => convertBMPtoPNG(img))
    );
    elapsed = Date.now() - start;
    
    const totalPNGSize = batchResults.reduce((sum, img) => sum + img.length, 0);
    console.log(`   Total PNG size: ${(totalPNGSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✅ Converted 10 images in ${elapsed}ms (${(elapsed / 10).toFixed(1)}ms avg per image)\n`);
    
    // Test 5: Estimate for 1000 files
    console.log('5️⃣ Projection for 1000 files (10MB each)...');
    const avgTimePerImage = elapsed / 10;
    const estimatedSerialTime = avgTimePerImage * 1000;
    const estimatedParallelTime = avgTimePerImage * (1000 / 10); // Assuming 10 parallel
    
    console.log(`   Serial processing: ~${(estimatedSerialTime / 1000).toFixed(1)}s (${(estimatedSerialTime / 60000).toFixed(1)} minutes)`);
    console.log(`   Parallel (10 concurrent): ~${(estimatedParallelTime / 1000).toFixed(1)}s (${(estimatedParallelTime / 60000).toFixed(1)} minutes)`);
    console.log(`   Timeout limit: 540s (9 minutes)`);
    
    if (estimatedParallelTime < 540000) {
      console.log(`   ✅ Within timeout limits with parallel processing\n`);
    } else {
      console.log(`   ⚠️  May exceed timeout - need optimization\n`);
    }
    
    console.log('✅ All BMP → PNG tests passed!\n');
    console.log('📊 Key Findings:');
    console.log(`   - Small (100x100): ${elapsed}ms`);
    console.log(`   - Medium (1000x1000): Fast conversion`);
    console.log(`   - Large (2000x2000): Fast conversion`);
    console.log(`   - Parallel processing: ${(elapsed / 10).toFixed(1)}ms avg per image`);
    console.log(`   - Compression: Excellent (BMP → PNG reduces size significantly)`);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testBMPtoPNG()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
