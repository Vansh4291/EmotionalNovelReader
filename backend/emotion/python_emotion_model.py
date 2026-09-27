import sys
import json
import logging

# Force UTF-8 stdio so sentence text survives the pipe regardless of the
# host's legacy code page (e.g. cp1252 on Windows), which would otherwise
# mojibake non-ASCII characters such as typographic quotes.
if hasattr(sys.stdin, "reconfigure"):
    sys.stdin.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Note: For full ML capabilities, uncomment the transformers block and install torch/transformers.
# pip install torch transformers
# 
# We default to a lightweight heuristic so the server doesn't crash if PyTorch isn't installed.

logging.basicConfig(level=logging.ERROR)

# Global variables for model lazy-loading
classifier = None

def load_model():
    global classifier
    try:
        from transformers import pipeline
        # j-hartmann/emotion-english-distilroberta-base predicts 7 emotions: anger, disgust, fear, joy, neutral, sadness, surprise
        classifier = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", top_k=1)
        return True
    except ImportError:
        return False

def analyze_heuristic(text):
    text_lower = text.lower()
    emotions = {
        'joy': ['happy', 'joy', 'smile', 'laugh', 'delight', 'glad', 'wonderful', 'beautiful', 'love', 'yay', 'bliss'],
        'sadness': ['sad', 'cry', 'tear', 'sorrow', 'pain', 'grief', 'lonely', 'mourn', 'empty', 'depressed'],
        'anger': ['angry', 'mad', 'rage', 'hate', 'furious', 'yell', 'shout', 'slam', 'smash', 'stupid', 'damn'],
        'fear': ['scared', 'fear', 'terrified', 'dread', 'panic', 'afraid', 'horror', 'tremble', 'shiver'],
        'surprise': ['surprise', 'shock', 'gasp', 'wow', 'suddenly', 'amazed', 'unbelievable', 'astounded']
    }
    
    scores = {k: 0 for k in emotions.keys()}
    for emotion, words in emotions.items():
        for word in words:
            if word in text_lower:
                scores[emotion] += 1
                
    max_score = max(scores.values())
    if max_score == 0:
        return {"emotion": "neutral", "confidence": 1.0}
        
    top_emotion = [k for k, v in scores.items() if v == max_score][0]
    confidence = min(1.0, max_score * 0.33)
    
    return {"emotion": top_emotion, "confidence": round(confidence, 2)}

def analyze_ml(text):
    global classifier
    if not classifier:
        return analyze_heuristic(text)
        
    try:
        # truncate text to 512 tokens approx
        truncated_text = text[:1500] 
        result = classifier(truncated_text)
        
        # result format: [[{'label': 'joy', 'score': 0.99}]]
        top_prediction = result[0][0]
        label = top_prediction['label']
        score = top_prediction['score']
        
        # map label if needed
        if label == 'disgust':
            label = 'anger' # mapping disgust to anger for our UI palette
            
        return {"emotion": label, "confidence": round(score, 2)}
    except Exception as e:
        logging.error(f"ML analysis failed: {e}")
        return analyze_heuristic(text)

def main():
    use_ml = load_model()
    
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps([]))
            return
            
        data = json.loads(input_data)
        sentences = data.get('sentences', [])
        
        results = []
        for index, text in enumerate(sentences):
            # Skip empty sentences
            if not text or not text.strip():
                results.append({
                    "index": index,
                    "text": text,
                    "emotion": "neutral",
                    "confidence": 1.0
                })
                continue
                
            if use_ml:
                res = analyze_ml(text)
            else:
                res = analyze_heuristic(text)
                
            results.append({
                "index": index,
                "text": text,
                "emotion": res["emotion"],
                "confidence": res["confidence"]
            })
            
        print(json.dumps(results, ensure_ascii=True))
    except Exception as e:
        logging.error(f"Error processing: {e}")
        print(json.dumps([]))

if __name__ == '__main__':
    main()
