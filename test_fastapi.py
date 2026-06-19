import requests

url = "http://localhost:8001/face/batch-enroll"
files = [
    ('images', ('frame1.jpg', open('face-ai/real_face.jpg', 'rb'), 'image/jpeg')),
    ('images', ('frame2.jpg', open('face-ai/real_face.jpg', 'rb'), 'image/jpeg')),
    ('images', ('frame3.jpg', open('face-ai/real_face.jpg', 'rb'), 'image/jpeg')),
    ('images', ('frame4.jpg', open('face-ai/real_face.jpg', 'rb'), 'image/jpeg'))
]
data = {
    'user_id': 1,
    'pose_labels': 'center,left,right,up'
}

response = requests.post(url, files=files, data=data)
print(response.status_code)
print(response.json())
