import requests
import json
import sseclient

def test():
    response = requests.post(
        "http://127.0.0.1:8000/api/race",
        json={"prompt": "Hello"},
        stream=True
    )
    client = sseclient.SSEClient(response)
    for event in client.events():
        print(event.data)

if __name__ == "__main__":
    test()
