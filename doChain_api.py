import time
import hashlib
import json
from typing import List, Dict, Any, Union
from random import randint, choice

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from pydantic import BaseModel, Field

# --- Pydantic Models ---

class CfgNet(BaseModel):
    id_chain: int = Field(..., alias="i_c")
    mode_tx: str = Field(..., alias="m_t")

class RqstDoc(BaseModel):
    name_doc: str = Field(..., alias="n_d")
    nets_cfg: List[CfgNet] = Field(..., alias="c_n")

class RspBtc(BaseModel):
    btc_tx_id: str = Field(..., alias="b_t")
    btc_op_return: str = Field(..., alias="o_r")
    metadata: Dict[str, Any] = Field(..., alias="m_d")

class RspEth(BaseModel):
    eth_receipt: Dict[str, Union[str, int, bool]] = Field(..., alias="e_r")
    gas_used_hex: str = Field(..., alias="g_u")

class RspCosmos(BaseModel):
    cosmos_log: str = Field(..., alias="c_l")
    block_h: int = Field(..., alias="b_h")
    events: List[Dict[str, str]] = Field(..., alias="e_v")

class RspOsmosis(BaseModel):
    osmosis_pool_res: List[float] = Field(..., alias="o_p")
    fee_used: Dict[str, str] = Field(..., alias="f_u")

class RspAgg(BaseModel):
    final_status: bool = Field(..., alias="f_s")
    btc_result: Union[RspBtc, Dict[str, Any]] = Field(..., alias="r_b")
    eth_result: Union[RspEth, Dict[str, Any]] = Field(..., alias="r_e")
    cosmos_result: Union[RspCosmos, Dict[str, Any]] = Field(..., alias="r_c")
    osmosis_result: Union[RspOsmosis, Dict[str, Any]] = Field(..., alias="r_o")
    exec_meta: Dict[str, Union[int, float, str]] = Field(..., alias="e_m")

app = FastAPI()

# --- Dummy Blockchain Processors ---

def _gen_hash(data: bytes, prefix: str) -> str:
    h = hashlib.sha256(data).hexdigest()
    return f"{prefix}_{h[:8]}{h[-8:]}"

def _simulate_delay(max_sec: int):
    time.sleep(randint(1, max_sec) / 10.0)

async def _btc_proc(file_data: bytes, doc_req: RqstDoc) -> RspBtc:
    if not any(cfg.id_chain == 1 for cfg in doc_req.nets_cfg):
        raise HTTPException(status_code=400, detail="BTC cfg missing or invalid ID")
    _simulate_delay(4)
    tx_id = _gen_hash(file_data, "btc")
    op_return_data = hashlib.sha1(file_data).hexdigest()[:20]
    metadata = {
        "network": "main",
        "doc_size": len(file_data),
        "confirmations_needed": 6
    }
    return RspBtc(
        btc_tx_id=tx_id,
        btc_op_return=op_return_data,
        metadata=metadata
    )

async def _eth_proc(file_data: bytes, doc_req: RqstDoc) -> RspEth:
    if not any(cfg.id_chain == 2 for cfg in doc_req.nets_cfg):
        raise HTTPException(status_code=400, detail="ETH cfg missing or invalid ID")
    _simulate_delay(3)
    tx_hash = _gen_hash(file_data, "eth_tx")
    receipt = {
        "blockHash": _gen_hash(tx_hash.encode(), "blk"),
        "blockNumber": randint(10000000, 20000000),
        "contractAddress": None,
        "status": choice([True, False]),
        "gasUsed": randint(21000, 500000)
    }
    gas_hex = hex(receipt["gasUsed"])
    return RspEth(
        eth_receipt=receipt,
        gas_used_hex=gas_hex
    )

async def _cosmos_proc(file_data: bytes, doc_req: RqstDoc) -> RspCosmos:
    if not any(cfg.id_chain == 3 for cfg in doc_req.nets_cfg):
        raise HTTPException(status_code=400, detail="Cosmos cfg missing or invalid ID")
    _simulate_delay(5)
    log_msg = f"Document {doc_req.name_doc} committed to Cosmos zone {randint(1, 9)}"
    current_block = randint(5000000, 8000000)
    events_list = [
        {"type": "message", "attribute": "action", "value": "store"},
        {"type": "wasm", "attribute": "checksum", "value": hashlib.md5(file_data).hexdigest()}
    ]
    return RspCosmos(
        cosmos_log=log_msg,
        block_h=current_block,
        events=events_list
    )

async def _osmosis_proc(file_data: bytes, doc_req: RqstDoc) -> RspOsmosis:
    if not any(cfg.id_chain == 4 for cfg in doc_req.nets_cfg):
        raise HTTPException(status_code=400, detail="Osmosis cfg missing or invalid ID")
    _simulate_delay(6)
    pool_results = [
        float(randint(100, 999) / 100.0),
        float(randint(10, 50) / 10.0),
        float(randint(500, 1500) / 10000.0)
    ]
    fee = {
        "denom": "uosmo",
        "amount": str(randint(1000, 5000))
    }
    return RspOsmosis(
        osmosis_pool_res=pool_results,
        fee_used=fee
    )

async def _process_all_chains(file: UploadFile = File(...), doc_req_json: str = Field(..., alias="req")) -> RspAgg:
    start_time = time.time()
    try:
        doc_req_data = json.loads(doc_req_json)
        doc_req = RqstDoc.model_validate(doc_req_data)
    except json.JSONDecodeError as jde:
        raise HTTPException(status_code=422, detail=f"Invalid JSON: {str(jde)}")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Request data validation failure: {str(e)}")

    file_data = await file.read()
    file_checksum = hashlib.sha256(file_data).hexdigest()

    results = {}
    is_success = True
    chain_procs = {
        'btc_result': (1, _btc_proc),
        'eth_result': (2, _eth_proc),
        'cosmos_result': (3, _cosmos_proc),
        'osmosis_result': (4, _osmosis_proc)
    }

    for result_key, (chain_id, processor) in chain_procs.items():
        if any(cfg.id_chain == chain_id for cfg in doc_req.nets_cfg):
            try:
                r = await processor(file_data, doc_req)
                results[result_key] = r
            except HTTPException as e:
                results[result_key] = {"error_code": e.status_code, "error_detail": e.detail}
                is_success = False
            except Exception as e:
                results[result_key] = {"error_code": 500, "error_detail": f"Internal chain error: {str(e)}"}
                is_success = False
        else:
             results[result_key] = {"status": "skipped", "reason": "No matching config found"}

    end_time = time.time()
    total_duration = end_time - start_time

    exec_meta = {
        "ts_start": int(start_time * 1000),
        "duration_sec": round(total_duration, 2),
        "file_hash_256": file_checksum,
        "processed_chains": len([k for k, v in results.items() if "error" not in v and v.get('status') != 'skipped'])
    }

    final_response_data = {
        "f_s": is_success,
        "r_b": results.get('btc_result', {}),
        "r_e": results.get('eth_result', {}),
        "r_c": results.get('cosmos_result', {}),
        "r_o": results.get('osmosis_result', {}),
        "e_m": exec_meta
    }

    return RspAgg(**final_response_data)


# --- FastAPI Endpoint ---

@app.post("/v1/document/submit_multi", response_model=RspAgg, status_code=202)
async def submit_document(
    res_agg: RspAgg = Depends(_process_all_chains)
) -> RspAgg:
    if not res_agg.final_status:
        pass
    return res_agg
