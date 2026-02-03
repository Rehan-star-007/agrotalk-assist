import cv2
import numpy as np
import base64
from PIL import Image
import io

def draw_disease_boxes(image: Image.Image, disease_name: str, confidence: float, is_healthy: bool = False) -> str:
    """
    Draws YOLO-style bounding boxes around detected disease spots.
    Uses robust OpenCV heuristics to ensure visual marks are visible.
    """
    try:
        # 1. Convert PIL to BGR for OpenCV
        # Use proper error handling for different PIL modes
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        img_np = np.array(image)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        height, width = img_bgr.shape[:2]
        output_img = img_bgr.copy()
        
        # is_healthy is now passed from the detector
        
        # Color configuration (YOLO style)
        box_color = (0, 0, 255) # BGR Red
        if is_healthy:
            box_color = (0, 255, 0) # BGR Green
            
        # 2. Advanced Saliency / Spot Detection
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        
        # Ranges for "unhealthy" colors (browns, yellows)
        lower_brown = np.array([10, 40, 20])
        upper_brown = np.array([40, 255, 220])
        mask_brown = cv2.inRange(hsv, lower_brown, upper_brown)
        
        # High contrast spots
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5,5), 0)
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                     cv2.THRESH_BINARY_INV, 15, 5)
        
        # Focus on "on-leaf" area (mask out the potentially dark background)
        _, leaf_mask = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        final_mask = cv2.bitwise_and(thresh, leaf_mask)
        final_mask = cv2.bitwise_or(final_mask, mask_brown)
        final_mask = cv2.bitwise_and(final_mask, leaf_mask)
        
        # Morphological clean up
        kernel = np.ones((3,3), np.uint8)
        final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_OPEN, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(final_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        boxes = []
        min_area = (width * height) * 0.003 
        max_area = (width * height) * 0.8   
        
        if not is_healthy:
            # Sort spots by area and take top ones
            sorted_contours = sorted(contours, key=cv2.contourArea, reverse=True)
            for cnt in sorted_contours:
                area = cv2.contourArea(cnt)
                if min_area < area < max_area:
                    x, y, w, h = cv2.boundingRect(cnt)
                    
                    # Prevent boxes from being too weird/thin
                    if 0.1 < (w/h) < 10:
                        boxes.append((x, y, w, h))
                    if len(boxes) >= 5: break
            
            # Fallback if no spots
            if not boxes:
                pad = max(20, int(min(width, height) * 0.2))
                boxes.append((pad, pad, width - 2*pad, height - 2*pad))
        else:
            # Healthy: One large Green box around center
            pad = max(30, int(min(width, height) * 0.15))
            boxes.append((pad, pad, width - 2*pad, height - 2*pad))

        # 3. DRAW BOXES (YOLO STYLE)
        for i, (x, y, w, h) in enumerate(boxes):
            label_text = f"{disease_name} {confidence}%" if i == 0 else "SPOT"
            if is_healthy: label_text = "HEALTHY"
            
            # Scale label based on image size
            scale = max(0.4, min(1.2, width / 600))
            thickness = max(1, int(width / 400))
            
            cv2.rectangle(output_img, (x, y), (x + w, y + h), box_color, thickness + 1)
            
            font = cv2.FONT_HERSHEY_DUPLEX
            (tw, th), bl = cv2.getTextSize(label_text, font, scale, thickness)
            
            # Label background
            cv2.rectangle(output_img, (x, y - th - 10), (x + tw + 10, y), box_color, -1)
            cv2.putText(output_img, label_text, (x + 5, y - 5), font, scale, (255, 255, 255), thickness)

        # 4. Convert back to Base64
        _, buffer = cv2.imencode('.jpg', output_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        base64_str = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_str}"

    except Exception as e:
        print(f"FAILED TO DRAW BOXES: {e}")
        # Always return something so the frontend doesn't break
        try:
            # Return original image if possible
            buffered = io.BytesIO()
            image.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            return f"data:image/jpeg;base64,{img_str}"
        except:
            return ""
