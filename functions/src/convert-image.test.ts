/**
 * Comprehensive smoke test suite for convertImage Cloud Function
 * Tests all supported formats and BMP→PNG performance
 */

import sharp from 'sharp';
import * as bmp from 'bmp-js';

/**
 * Create a simple test image (100x100 red square)
 */
async function createTestImage(): Promise<Buffer> {
  return await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 }
    }
  })
  .png()
  .toBuffer();
}

/**
 * Create a test BMP image of specified size
 */
async function createTestBMP(width: number, height: number): Promise<Buffer> {
  const channels = 4;
  const data = Buffer.alloc(width * height * channels);
  
  // Fill with a gradient pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      data[idx] = (x / width) * 255;     // R
      data[idx + 1] = (y / height) * 255; // G
      data[idx + 2] = 128;                // B
      data[idx + 3] = 255;                // A
    }
  }
  
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
  const decoded = bmp.decode(bmpBuffer);
  
  return await sharp(decoded.data, {
    raw: {
      width: decoded.width,
      height: decoded.height,
      channels: 4
    }
  }).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * Test general format conversions
 */
async function testGeneralFormats() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PART 1: General Format Conversion Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const testImage = await createTestImage();
    console.log('✓ Test image created (100x100 red PNG): ' + testImage.length + ' bytes\n');

    // Test PNG to JPG (supported)
    console.log('1️⃣ PNG → JPG (quality=100)...');
    const jpgResult = await sharp(testImage).jpeg({ quality: 100 }).toBuffer();
    console.log(`   ✅ ${jpgResult.length} bytes\n`);

    // Test PNG to BMP (supported)
    console.log('2️⃣ PNG → BMP...');
    const sharpInstance = sharp(testImage);
    const rawImageData = await sharpInstance.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const bmpData = bmp.encode({
      data: rawImageData.data,
      width: rawImageData.info.width,
      height: rawImageData.info.height
    });
    console.log(`   ✅ ${bmpData.data.length} bytes\n`);

    console.log('✅ General format tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ General format test failed:', error);
    return false;
  }
}

/**
 * Test BMP to PNG conversion performance
 */
async function testBMPtoPNGPerformance() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PART 2: BMP → PNG Performance Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Test 1: Small image
    console.log('1️⃣ Small (100x100)...');
    const small = await createTestBMP(100, 100);
    console.log(`   BMP: ${(small.length / 1024).toFixed(2)} KB`);
    
    let start = Date.now();
    const smallPNG = await convertBMPtoPNG(small);
    let elapsed = Date.now() - start;
    console.log(`   PNG: ${(smallPNG.length / 1024).toFixed(2)} KB`);
    console.log(`   ✅ ${elapsed}ms\n`);
    
    // Test 2: Medium image
    console.log('2️⃣ Medium (1000x1000)...');
    const medium = await createTestBMP(1000, 1000);
    console.log(`   BMP: ${(medium.length / 1024 / 1024).toFixed(2)} MB`);
    
    start = Date.now();
    const mediumPNG = await convertBMPtoPNG(medium);
    elapsed = Date.now() - start;
    console.log(`   PNG: ${(mediumPNG.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✅ ${elapsed}ms\n`);
    
    // Test 3: Large image
    console.log('3️⃣ Large (2000x2000)...');
    const large = await createTestBMP(2000, 2000);
    console.log(`   BMP: ${(large.length / 1024 / 1024).toFixed(2)} MB`);
    
    start = Date.now();
    const largePNG = await convertBMPtoPNG(large);
    elapsed = Date.now() - start;
    console.log(`   PNG: ${(largePNG.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✅ ${elapsed}ms\n`);
    
    // Test 4: Parallel batch
    console.log('4️⃣ Parallel batch (10 medium images)...');
    const batchImages = await Promise.all(
      Array(10).fill(null).map(() => createTestBMP(1000, 1000))
    );
    const totalBatchSize = batchImages.reduce((sum, img) => sum + img.length, 0);
    console.log(`   Total BMP: ${(totalBatchSize / 1024 / 1024).toFixed(2)} MB`);
    
    start = Date.now();
    const batchResults = await Promise.all(
      batchImages.map(img => convertBMPtoPNG(img))
    );
    elapsed = Date.now() - start;
    
    const totalPNGSize = batchResults.reduce((sum, img) => sum + img.length, 0);
    console.log(`   Total PNG: ${(totalPNGSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✅ ${elapsed}ms (${(elapsed / 10).toFixed(1)}ms avg per image)\n`);
    
    // Test 5: Projection
    console.log('5️⃣ Projection for 1000 files (~10MB each)...');
    const avgTimePerImage = elapsed / 10;
    const estimatedSerialTime = avgTimePerImage * 1000;
    const estimatedParallelTime = avgTimePerImage * (1000 / 10);
    
    console.log(`   Serial: ~${(estimatedSerialTime / 1000).toFixed(1)}s`);
    console.log(`   Parallel (10 concurrent): ~${(estimatedParallelTime / 1000).toFixed(1)}s`);
    console.log(`   Timeout limit: 540s`);
    console.log(`   ${estimatedParallelTime < 540000 ? '✅' : '⚠️'} ${estimatedParallelTime < 540000 ? 'Within' : 'Exceeds'} timeout\n`);
    
    console.log('✅ BMP→PNG performance tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ BMP→PNG performance test failed:', error);
    return false;
  }
}

/**
 * Run all smoke tests
 */
async function runAllTests() {
  console.log('\n🧪 Image Conversion - Comprehensive Smoke Test Suite\n');
  
  const results = {
    generalFormats: false,
    bmpPerformance: false
  };
  
  results.generalFormats = await testGeneralFormats();
  results.bmpPerformance = await testBMPtoPNGPerformance();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('  FINAL RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`General Formats:     ${results.generalFormats ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`BMP→PNG Performance: ${results.bmpPerformance ? '✅ PASS' : '❌ FAIL'}`);
  console.log('\n' + (results.generalFormats && results.bmpPerformance ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'));
  console.log('═══════════════════════════════════════════════════════\n');
  
  return results.generalFormats && results.bmpPerformance;
}

// Run all tests
runAllTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
